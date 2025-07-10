'use client';

import { useAlgoliaCredentials } from '@/lib';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import useSWR from 'swr';

type IndexSettings = {
  searchableAttributes: string[];
  customRanking: string[];
  attributesForFaceting: string[];
  sortReplicas: Array<{
    attribute: string;
    direction: string;
    replica: string;
  }>;
  indexName: string;
};

type AISuggestion = {
  searchableAttributes: {
    data: string[];
    reasoning: string;
  };
  customRanking: {
    data: string[];
    reasoning: string;
  };
  attributesForFaceting: {
    data: string[];
    reasoning: string;
  };
  sortableAttributes: {
    data: string[];
    reasoning: string;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ComparePage() {
  const { appId, writeApiKey, updateCredentials } = useAlgoliaCredentials();
  const [indexName, setIndexName] = useState('');
  const [shouldCompare, setShouldCompare] = useState(false);

  const settingsUrl =
    shouldCompare && indexName && appId && writeApiKey
      ? `/api/indices/${indexName}/settings?appId=${encodeURIComponent(
          appId
        )}&writeApiKey=${encodeURIComponent(writeApiKey)}`
      : null;

  const hitsUrl =
    shouldCompare && indexName && appId && writeApiKey
      ? `/api/indices/${indexName}/hits?appId=${encodeURIComponent(
          appId
        )}&writeApiKey=${encodeURIComponent(writeApiKey)}`
      : null;

  const {
    data: currentSettings,
    isLoading: isCurrentSettingsLoading,
    error: settingsError,
  } = useSWR(settingsUrl, fetcher);

  const {
    data: hitsData,
    isLoading: isHitsDataLoading,
    error: hitsError,
  } = useSWR(hitsUrl, fetcher);

  const {
    data: suggestedSettings,
    isLoading: isSuggestedSettingsLoading,
    error: suggestionsError,
  } = useSWR(
    hitsData?.hits ? ['suggestions', indexName, hitsData.hits] : null,
    async () => {
      const res = await fetch('/api/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: hitsData.hits, indexName }),
      });
      if (!res.ok) throw new Error('Failed to generate suggestions');
      return res.json();
    }
  );

  const isLoading =
    isCurrentSettingsLoading || isHitsDataLoading || isSuggestedSettingsLoading;
  const error = settingsError || hitsError || suggestionsError;

  function onCompare() {
    if (!indexName || !appId || !writeApiKey) return;
    setShouldCompare(true);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Compare Index Configuration</h1>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="app-id" className="block text-sm font-medium mb-2">
              Algolia App ID
            </label>
            <input
              id="app-id"
              type="text"
              value={appId}
              onChange={(e) => updateCredentials({ appId: e.target.value })}
              placeholder="Enter your Algolia App ID..."
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label
              htmlFor="write-api-key"
              className="block text-sm font-medium mb-2"
            >
              Algolia Write API Key
            </label>
            <input
              id="write-api-key"
              type="password"
              value={writeApiKey}
              onChange={(e) =>
                updateCredentials({ writeApiKey: e.target.value })
              }
              placeholder="Enter your Algolia Admin API Key..."
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              <strong>Required ACLs:</strong>{' '}
              <code className="text-mono bg-red-100 text-red-600 border-red-200 py-0.5 px-1 rounded">
                search
              </code>
              ,{' '}
              <code className="text-mono bg-red-100 text-red-600 border-red-200 py-0.5 px-1 rounded">
                addObject
              </code>
              ,{' '}
              <code className="text-mono bg-red-100 text-red-600 border-red-200 py-0.5 px-1 rounded">
                settings
              </code>
              ,{' '}
              <code className="text-mono bg-red-100 text-red-600 border-red-200 py-0.5 px-1 rounded">
                editSettings
              </code>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="index-name"
              className="block text-sm font-medium mb-2"
            >
              Index Name
            </label>
            <input
              id="index-name"
              type="text"
              value={indexName}
              onChange={(e) => {
                setIndexName(e.target.value);
                setShouldCompare(false);
              }}
              placeholder="Enter existing index name..."
              className="w-full p-3 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={onCompare}
              disabled={!indexName || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter an existing index name to compare its current configuration with
          AI-generated suggestions.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error.message || 'An error occurred'}
        </div>
      )}

      {currentSettings && suggestedSettings && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              Configuration Comparison
            </h2>
            <p className="text-gray-600">
              Index: {currentSettings.indexName} • {hitsData?.hits?.length || 0} records
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-gray-50 border-gray-200 border rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Current Configuration
              </h3>
              <div className="space-y-4 grid grid-rows-4 flex-1">
                <AttributeGroup
                  title="Searchable Attributes"
                  icon="🔍"
                  attributes={currentSettings?.searchableAttributes || []}
                />
                <AttributeGroup
                  title="Custom Ranking"
                  icon="📊"
                  attributes={currentSettings?.customRanking || []}
                />
                <AttributeGroup
                  title="Attributes for Faceting"
                  icon="🏷️"
                  attributes={currentSettings?.attributesForFaceting || []}
                />
                <AttributeGroup
                  title="Sortable Attributes"
                  icon="🔀"
                  attributes={currentSettings?.sortReplicas?.map(r => r.attribute) || []}
                />
              </div>
            </div>
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                AI-Generated Suggestions
              </h3>
              <div className="space-y-4 grid grid-rows-4 flex-1">
                <AttributeGroup
                  title="Searchable Attributes"
                  icon="🔍"
                  attributes={suggestedSettings?.searchableAttributes.data || []}
                  reasoning={suggestedSettings?.searchableAttributes.reasoning}
                />
                <AttributeGroup
                  title="Custom Ranking"
                  icon="📊"
                  attributes={suggestedSettings?.customRanking.data || []}
                  reasoning={suggestedSettings?.customRanking.reasoning}
                />
                <AttributeGroup
                  title="Attributes for Faceting"
                  icon="🏷️"
                  attributes={suggestedSettings?.attributesForFaceting.data || []}
                  reasoning={suggestedSettings?.attributesForFaceting.reasoning}
                />
                <AttributeGroup
                  title="Sortable Attributes"
                  icon="🔀"
                  attributes={suggestedSettings?.sortableAttributes.data || []}
                  reasoning={suggestedSettings?.sortableAttributes.reasoning}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              📊 Configuration Summary
            </h3>
            <ConfigurationSummary
              current={currentSettings}
              suggested={suggestedSettings}
            />
          </div>
        </div>
      )}
    </div>
  );
}


function AttributeGroup({
  title,
  icon,
  attributes,
  reasoning,
}: {
  title: string;
  icon: string;
  attributes: string[];
  reasoning?: string;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (attributes.length === 0) {
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {icon} {title}
        </h4>
        <p className="text-sm text-gray-500 italic">No attributes configured</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        {icon} {title}
      </h4>
      <div className="flex flex-wrap gap-2 mb-2">
        {attributes.map((attr, index) => (
          <span
            key={`${attr}-${index}`}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200"
          >
            <span className="text-gray-600 mr-1">{index + 1}.</span>
            {attr}
          </span>
        ))}
      </div>
      {reasoning && (
        <div className="mt-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {showReasoning ? '▼ Hide reasoning' : '▶ Show reasoning'}
          </button>
          {showReasoning && (
            <div className="text-xs text-gray-600 mt-1 pl-3 border-l-2 border-gray-200 prose prose-xs max-w-none">
              <ReactMarkdown>{reasoning}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ConfigurationSummaryProps = {
  current: IndexSettings | null;
  suggested: AISuggestion | null;
};

function ConfigurationSummary({
  current,
  suggested,
}: ConfigurationSummaryProps) {
  if (!current || !suggested) return null;

  const generateDiff = (
    currentItems: string[],
    suggestedItems: string[],
    title: string
  ) => {
    const currentSet = new Set(currentItems || []);
    const suggestedSet = new Set(suggestedItems || []);

    const added = suggestedItems.filter((item) => !currentSet.has(item));
    const removed = currentItems.filter((item) => !suggestedSet.has(item));
    const unchanged = currentItems.filter((item) => suggestedSet.has(item));

    return { added, removed, unchanged, title };
  };

  const diffs = [
    generateDiff(
      current.searchableAttributes || [],
      suggested.searchableAttributes?.data || [],
      'Searchable Attributes'
    ),
    generateDiff(
      current.customRanking || [],
      suggested.customRanking?.data || [],
      'Custom Ranking'
    ),
    generateDiff(
      current.attributesForFaceting || [],
      suggested.attributesForFaceting?.data || [],
      'Attributes for Faceting'
    ),
    generateDiff(
      current.sortReplicas?.map((r) => r.attribute) || [],
      suggested.sortableAttributes?.data || [],
      'Sortable Attributes'
    ),
  ];

  return (
    <div className="space-y-4">
      {diffs.map((diff, index) => (
        <div key={index} className="border-l-4 border-yellow-300 pl-4">
          <h4 className="font-medium text-yellow-800 mb-2">{diff.title}</h4>
          <div className="space-y-1 text-sm">
            {diff.added.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-medium">+</span>
                <div className="flex flex-wrap gap-1">
                  {diff.added.map((item, i) => (
                    <span
                      key={i}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {diff.removed.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium">-</span>
                <div className="flex flex-wrap gap-1">
                  {diff.removed.map((item, i) => (
                    <span
                      key={i}
                      className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {diff.unchanged.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-600 font-medium">=</span>
                <div className="flex flex-wrap gap-1">
                  {diff.unchanged.map((item, i) => (
                    <span
                      key={i}
                      className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {diff.added.length === 0 &&
              diff.removed.length === 0 &&
              diff.unchanged.length === 0 && (
                <span className="text-gray-500 text-xs italic">
                  No configuration
                </span>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
