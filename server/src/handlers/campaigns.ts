import { db } from '../db';
import { campaignsTable } from '../db/schema';
import { type CreateCampaignInput, type UpdateCampaignInput, type Campaign, type FilterInput } from '../schema';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  try {
    // Insert campaign record
    const result = await db.insert(campaignsTable)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        goalAmount: input.goalAmount.toString(), // Convert number to string for numeric column
        status: input.status,
        customFields: input.customFields,
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const campaign = result[0];
    return {
      ...campaign,
      goalAmount: parseFloat(campaign.goalAmount), // Convert string back to number
      currentAmountRaised: parseFloat(campaign.currentAmountRaised), // Convert string back to number
      customFields: campaign.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Campaign creation failed:', error);
    throw error;
  }
}

export async function getCampaigns(filter: FilterInput): Promise<{ campaigns: Campaign[]; total: number }> {
  try {
    // Build conditions array
    const conditions = [eq(campaignsTable.tenantId, filter.tenantId)];

    // Add search filter
    if (filter.search) {
      conditions.push(ilike(campaignsTable.name, `%${filter.search}%`));
    }

    // Apply where clause
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Build main query in one chain to avoid type conflicts
    const offset = (filter.page - 1) * filter.limit;
    let campaigns;
    
    // Handle sorting explicitly to avoid type issues
    if (filter.sortBy) {
      const isAscending = filter.sortOrder === 'asc';
      
      switch (filter.sortBy) {
        case 'id':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.id) : desc(campaignsTable.id))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        case 'name':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.name) : desc(campaignsTable.name))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        case 'goalAmount':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.goalAmount) : desc(campaignsTable.goalAmount))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        case 'status':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.status) : desc(campaignsTable.status))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        case 'createdAt':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.createdAt) : desc(campaignsTable.createdAt))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        case 'updatedAt':
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(isAscending ? asc(campaignsTable.updatedAt) : desc(campaignsTable.updatedAt))
            .limit(filter.limit)
            .offset(offset)
            .execute();
          break;
        default:
          // Default to createdAt if sortBy is not recognized
          campaigns = await db.select()
            .from(campaignsTable)
            .where(whereClause)
            .orderBy(desc(campaignsTable.createdAt))
            .limit(filter.limit)
            .offset(offset)
            .execute();
      }
    } else {
      campaigns = await db.select()
        .from(campaignsTable)
        .where(whereClause)
        .orderBy(desc(campaignsTable.createdAt))
        .limit(filter.limit)
        .offset(offset)
        .execute();
    }

    // Build count query
    const totalResult = await db.select({ count: count() })
      .from(campaignsTable)
      .where(whereClause)
      .execute();

    // Convert numeric fields back to numbers
    const processedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      goalAmount: parseFloat(campaign.goalAmount),
      currentAmountRaised: parseFloat(campaign.currentAmountRaised),
      customFields: campaign.customFields as Record<string, any> | null,
    }));

    return {
      campaigns: processedCampaigns,
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Failed to get campaigns:', error);
    throw error;
  }
}

export async function getCampaignById(id: number, tenantId: string): Promise<Campaign | null> {
  try {
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(and(
        eq(campaignsTable.id, id),
        eq(campaignsTable.tenantId, tenantId)
      ))
      .execute();

    if (campaigns.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const campaign = campaigns[0];
    return {
      ...campaign,
      goalAmount: parseFloat(campaign.goalAmount),
      currentAmountRaised: parseFloat(campaign.currentAmountRaised),
      customFields: campaign.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Failed to get campaign by ID:', error);
    throw error;
  }
}

export async function updateCampaign(input: UpdateCampaignInput, tenantId: string): Promise<Campaign> {
  try {
    // Build update object, converting numeric fields to strings
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.goalAmount !== undefined) updateData.goalAmount = input.goalAmount.toString();
    if (input.currentAmountRaised !== undefined) updateData.currentAmountRaised = input.currentAmountRaised.toString();
    if (input.status !== undefined) updateData.status = input.status;
    if (input.customFields !== undefined) updateData.customFields = input.customFields;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const result = await db.update(campaignsTable)
      .set(updateData)
      .where(and(
        eq(campaignsTable.id, input.id),
        eq(campaignsTable.tenantId, tenantId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Campaign not found or access denied');
    }

    // Convert numeric fields back to numbers
    const campaign = result[0];
    return {
      ...campaign,
      goalAmount: parseFloat(campaign.goalAmount),
      currentAmountRaised: parseFloat(campaign.currentAmountRaised),
      customFields: campaign.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Campaign update failed:', error);
    throw error;
  }
}

export async function deleteCampaign(id: number, tenantId: string): Promise<void> {
  try {
    const result = await db.delete(campaignsTable)
      .where(and(
        eq(campaignsTable.id, id),
        eq(campaignsTable.tenantId, tenantId)
      ))
      .execute();

    if (result.rowCount === 0) {
      throw new Error('Campaign not found or access denied');
    }
  } catch (error) {
    console.error('Campaign deletion failed:', error);
    throw error;
  }
}