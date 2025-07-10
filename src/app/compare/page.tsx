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
          <h2 className="text-lg font-medium">
            {currentSettings.indexName} • {hitsData?.hits?.length || 0} records
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfigSection
              title="Current"
              currentSettings={currentSettings}
              bgColor="bg-gray-50"
            />
            <ConfigSection
              title="AI Suggestions"
              suggestedSettings={suggestedSettings}
              bgColor="bg-blue-50"
            />
          </div>

          <ConfigurationSummary
            current={currentSettings}
            suggested={suggestedSettings}
          />
        </div>
      )}
    </div>
  );
}

type ConfigSectionProps = {
  title: string;
  currentSettings?: IndexSettings;
  suggestedSettings?: AISuggestion;
  bgColor: string;
};

function ConfigSection({
  title,
  currentSettings,
  suggestedSettings,
  bgColor,
}: ConfigSectionProps) {
  const sections = [
    {
      name: 'Searchable',
      icon: '🔍',
      data:
        currentSettings?.searchableAttributes ||
        suggestedSettings?.searchableAttributes.data,
      reasoning: suggestedSettings?.searchableAttributes.reasoning,
    },
    {
      name: 'Ranking',
      icon: '📊',
      data:
        currentSettings?.customRanking || suggestedSettings?.customRanking.data,
      reasoning: suggestedSettings?.customRanking?.reasoning,
    },
    {
      name: 'Faceting',
      icon: '🏷️',
      data:
        currentSettings?.attributesForFaceting ||
        suggestedSettings?.attributesForFaceting.data,
      reasoning: suggestedSettings?.attributesForFaceting.reasoning,
    },
    {
      name: 'Sortable',
      icon: '🔀',
      data:
        currentSettings?.sortReplicas.map((r) => r.attribute) ||
        suggestedSettings?.sortableAttributes.data,
      reasoning: suggestedSettings?.sortableAttributes?.reasoning,
    },
  ];

  return (
    <div className={`${bgColor} border rounded p-4`}>
      <h3 className="font-medium mb-4">{title}</h3>
      <div className="space-y-4">
        {sections.map((section) => (
          <AttributeGroup
            key={section.name}
            title={section.name}
            icon={section.icon}
            // @ts-expect-error It won't be undefined
            attributes={section.data}
            reasoning={section.reasoning}
          />
        ))}
      </div>
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

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">
        {icon} {title}
      </h4>
      {attributes.length === 0 ? (
        <p className="text-xs text-gray-500">None</p>
      ) : (
        <div className="flex flex-wrap gap-1 mb-2">
          {attributes.map((attr, i) => (
            <span key={i} className="bg-white px-2 py-1 rounded text-xs border">
              {attr}
            </span>
          ))}
        </div>
      )}
      {reasoning && (
        <div>
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showReasoning ? 'Hide' : 'Show'} reasoning
          </button>
          {showReasoning && (
            <div className="mt-1 text-xs text-gray-600 pl-2 border-l-2">
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

  const sections = [
    {
      name: 'Searchable',
      current: current.searchableAttributes || [],
      suggested: suggested.searchableAttributes?.data || [],
    },
    {
      name: 'Ranking',
      current: current.customRanking || [],
      suggested: suggested.customRanking?.data || [],
    },
    {
      name: 'Faceting',
      current: current.attributesForFaceting || [],
      suggested: suggested.attributesForFaceting?.data || [],
    },
    {
      name: 'Sortable',
      current: current.sortReplicas?.map((r) => r.attribute) || [],
      suggested: suggested.sortableAttributes?.data || [],
    },
  ];

  return (
    <div className="bg-yellow-50 border rounded p-4">
      <h3 className="font-medium mb-4">Changes Summary</h3>
      <div className="space-y-3">
        {sections.map((section) => {
          const currentSet = new Set(section.current);
          const suggestedSet = new Set(section.suggested);
          const added = section.suggested.filter(
            (item) => !currentSet.has(item)
          );
          const removed = section.current.filter(
            (item) => !suggestedSet.has(item)
          );

          if (added.length === 0 && removed.length === 0) return null;

          return (
            <div key={section.name} className="text-sm">
              <div className="font-medium mb-1">{section.name}</div>
              {added.length > 0 && (
                <div className="flex gap-1 mb-1">
                  <span className="text-green-600">+</span>
                  {added.map((item, i) => (
                    <span key={i} className="bg-green-100 px-1 rounded text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {removed.length > 0 && (
                <div className="flex gap-1">
                  <span className="text-red-600">-</span>
                  {removed.map((item, i) => (
                    <span key={i} className="bg-red-100 px-1 rounded text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
