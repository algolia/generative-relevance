'use client';

import { useAlgoliaCredentials } from '@/lib';
import { Hit } from 'algoliasearch';
import { useParams } from 'next/navigation';
import { useState } from 'react';
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

export default function Page() {
  const params = useParams();
  const indexName = params.indexName as string;

  const { appId, writeApiKey, updateCredentials } = useAlgoliaCredentials();
  const [showCredentials, setShowCredentials] = useState(
    !appId || !writeApiKey
  );

  const credentialsQuery =
    appId && writeApiKey
      ? `?appId=${encodeURIComponent(appId)}&writeApiKey=${encodeURIComponent(
          writeApiKey
        )}`
      : null;

  const {
    data: hitsData,
    isLoading: isHitsLoading,
    error: hitsError,
  } = useSWR<{ hits: Hit[] }>(
    indexName && credentialsQuery
      ? `/api/indices/${indexName}/hits${credentialsQuery}`
      : null,
    fetcher
  );

  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useSWR(
    indexName && credentialsQuery
      ? `/api/indices/${indexName}/settings${credentialsQuery}`
      : null,
    fetcher
  );

  const hits = hitsData?.hits || [];
  const loading = !settings && !settingsError && !hitsError && credentialsQuery;
  const error = hitsError || settingsError;
  const isProcessing = isHitsLoading && isSettingsLoading;

  if (showCredentials || !credentialsQuery) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Enter Algolia Credentials</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            To view the index details, please provide your Algolia credentials.
          </p>
        </div>
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
              disabled={isProcessing}
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
              disabled={isProcessing}
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
        <button
          onClick={() => setShowCredentials(false)}
          disabled={!appId || !writeApiKey}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Load Index
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading hits...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message || 'Failed to load data'}
        </div>
        <button
          onClick={() => setShowCredentials(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Update Credentials
        </button>
      </div>
    );
  }

  const hasConfiguration =
    settings &&
    (settings.searchableAttributes.length > 0 ||
      settings.customRanking.length > 0 ||
      settings.attributesForFaceting.length > 0 ||
      settings.sortReplicas.length > 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Index: {indexName}</h1>
        <p className="text-gray-600">{hits.length} hits</p>
      </div>

      {hasConfiguration && <ConfigurationPanel settings={settings} />}

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Hits</h2>
      </div>

      {hits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hits found in this index.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hits.map((record, index) => (
            <RecordCard
              key={record.objectID || index}
              record={record}
              settings={settings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type AttributeSectionProps = {
  title: string;
  attributes: string[];
  colorClass: string;
};

function AttributeSection({
  title,
  attributes,
  colorClass,
}: AttributeSectionProps) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {attributes.map((attr, index) => (
          <span
            key={`${attr}-${index}`}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            <span className="text-blue-600 mr-1">{index + 1}.</span>
            {attr}
          </span>
        ))}
      </div>
    </div>
  );
}

type RecordCardProps = {
  record: Hit;
  settings: IndexSettings | null;
};

function RecordCard({ record, settings }: RecordCardProps) {
  const filteredRecord = Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.startsWith('_'))
  ) as Hit;

  const hasIcons =
    settings &&
    (settings.searchableAttributes.length > 0 ||
      settings.customRanking.length > 0 ||
      settings.attributesForFaceting.length > 0 ||
      settings.sortReplicas.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-500">
          Object ID: {record.objectID || 'N/A'}
        </span>
      </div>
      <div className="relative">
        <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
          {formatRecordWithIcons(
            filteredRecord,
            settings?.searchableAttributes || [],
            settings?.customRanking || [],
            settings?.attributesForFaceting || [],
            Array.from(
              new Set(settings?.sortReplicas.map((r) => r.attribute) || [])
            )
          )}
        </pre>
        {hasIcons && (
          <div className="absolute top-2 right-2">
            <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded shadow-sm space-y-1">
              {settings?.searchableAttributes.length > 0 && (
                <div>🔍 = searchable</div>
              )}
              {settings?.customRanking.length > 0 && <div>📊 = ranking</div>}
              {settings?.attributesForFaceting.length > 0 && (
                <div>🏷️ = faceting</div>
              )}
              {settings?.sortReplicas.length > 0 && <div>🔀 = sorting</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ConfigurationPanelProps = {
  settings: IndexSettings;
};

function ConfigurationPanel({ settings }: ConfigurationPanelProps) {
  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
        <h2 className="text-lg font-semibold text-gray-800">
          AI-Generated Search Configuration
        </h2>
      </div>

      {settings.searchableAttributes.length > 0 && (
        <AttributeSection
          title="Searchable Attributes"
          attributes={settings.searchableAttributes}
          colorClass="bg-blue-100 text-blue-800 border-blue-200"
        />
      )}

      {settings.customRanking.length > 0 && (
        <AttributeSection
          title="Custom Ranking"
          attributes={settings.customRanking}
          colorClass="bg-purple-100 text-purple-800 border-purple-200"
        />
      )}

      {settings.attributesForFaceting.length > 0 && (
        <AttributeSection
          title="Faceting Attributes"
          attributes={settings.attributesForFaceting}
          colorClass="bg-green-100 text-green-800 border-green-200"
        />
      )}

      {settings.sortReplicas.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Sort Options
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Set(settings.sortReplicas.map((r) => r.attribute))
            ).map((attribute, index) => (
              <span
                key={attribute}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"
              >
                <span className="text-orange-600 mr-1">{index + 1}.</span>
                {attribute} (asc, desc)
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Created {settings.sortReplicas.length} replica indices for sorting
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 italic">
        <span className="font-medium">AI Reasoning:</span> These configurations
        were automatically selected based on content analysis to optimize search
        relevance, ranking, filtering, and sorting.
      </div>
    </div>
  );
}

async function fetcher(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch');
  }

  return response.json();
}

function formatRecordWithIcons(
  obj: Hit,
  searchableAttrs: string[] = [],
  customRankingAttrs: string[] = [],
  facetingAttrs: string[] = [],
  sortingAttrs: string[] = []
) {
  const formatted = JSON.stringify(obj, null, 2);

  if (
    !searchableAttrs.length &&
    !customRankingAttrs.length &&
    !facetingAttrs.length &&
    !sortingAttrs.length
  ) {
    return formatted;
  }

  let result = formatted;

  const rankingAttrNames = extractAttributeNames(
    customRankingAttrs,
    /(?:desc|asc)\(([^)]+)\)/
  );
  const facetAttrNames = extractAttributeNames(
    facetingAttrs,
    /(?:searchable|filterOnly)\(([^)]+)\)/
  );

  const allAttrs = new Set([
    ...searchableAttrs,
    ...rankingAttrNames,
    ...facetAttrNames,
    ...sortingAttrs,
  ]);

  allAttrs.forEach((attr) => {
    let icons = '';
    if (searchableAttrs.includes(attr)) icons += '🔍';
    if (rankingAttrNames.includes(attr)) icons += '📊';
    if (facetAttrNames.includes(attr)) icons += '🏷️';
    if (sortingAttrs.includes(attr)) icons += '🔀';

    if (icons) {
      const keyPattern = new RegExp(`"${attr}":`, 'g');
      result = result.replace(keyPattern, `"${attr}": ${icons}`);
    }
  });

  return result;
}

function extractAttributeNames(attributes: string[], pattern: RegExp) {
  return attributes.map((attribute) => {
    const match = attribute.match(pattern);

    return match ? match[1] : attribute;
  });
}
