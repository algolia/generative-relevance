import { NextRequest, NextResponse } from 'next/server';
import { generateSearchableAttributes } from '@/lib/generate-searchable-attributes';
import { generateCustomRanking } from '@/lib/generate-custom-ranking';
import { generateAttributesForFaceting } from '@/lib/generate-attributes-for-faceting';
import { generateSortByReplicas } from '@/lib/generate-sort-by-replicas';

export async function POST(request: NextRequest) {
  try {
    const { records, indexName } = await request.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid records provided' },
        { status: 400 }
      );
    }

    if (!indexName) {
      return NextResponse.json(
        { error: 'Index name is required' },
        { status: 400 }
      );
    }

    const [
      searchableAttributes,
      customRanking,
      attributesForFaceting,
      sortableAttributes,
    ] = await Promise.all([
      generateSearchableAttributes(records),
      generateCustomRanking(records),
      generateAttributesForFaceting(records),
      generateSortByReplicas(records),
    ]);

    return NextResponse.json({
      searchableAttributes: {
        ...searchableAttributes,
        data: searchableAttributes.searchableAttributes,
      },
      customRanking: {
        ...customRanking,
        data: customRanking.customRanking,
      },
      attributesForFaceting: {
        ...attributesForFaceting,
        data: attributesForFaceting.attributesForFaceting,
      },
      sortableAttributes: {
        ...sortableAttributes,
        data: sortableAttributes.sortableAttributes,
      },
    });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI suggestions' },
      { status: 500 }
    );
  }
}
