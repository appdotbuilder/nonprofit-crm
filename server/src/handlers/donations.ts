import { db } from '../db';
import { donationsTable, campaignsTable, donorsTable } from '../db/schema';
import { type CreateDonationInput, type UpdateDonationInput, type Donation, type FilterInput } from '../schema';
import { eq, and, desc, asc, ilike, sql, SQL } from 'drizzle-orm';

export async function createDonation(input: CreateDonationInput): Promise<Donation> {
  try {
    // Verify donor exists and belongs to same tenant
    const donor = await db.select()
      .from(donorsTable)
      .where(and(
        eq(donorsTable.id, input.donorId),
        eq(donorsTable.tenantId, input.tenantId)
      ))
      .execute();

    if (donor.length === 0) {
      throw new Error('Donor not found or access denied');
    }

    // If campaign is provided, verify it exists and belongs to same tenant
    if (input.campaignId) {
      const campaign = await db.select()
        .from(campaignsTable)
        .where(and(
          eq(campaignsTable.id, input.campaignId),
          eq(campaignsTable.tenantId, input.tenantId)
        ))
        .execute();

      if (campaign.length === 0) {
        throw new Error('Campaign not found or access denied');
      }
    }

    // Create donation record
    const result = await db.insert(donationsTable)
      .values({
        tenantId: input.tenantId,
        donorId: input.donorId,
        campaignId: input.campaignId,
        amount: input.amount.toString(),
        date: input.date,
        status: input.status,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        customFields: input.customFields
      })
      .returning()
      .execute();

    const donation = result[0];

    // Update campaign's currentAmountRaised if campaignId is provided and status is 'Received'
    if (input.campaignId && input.status === 'Received') {
      await db.update(campaignsTable)
        .set({
          currentAmountRaised: sql`${campaignsTable.currentAmountRaised} + ${input.amount.toString()}`,
          updatedAt: new Date()
        })
        .where(eq(campaignsTable.id, input.campaignId))
        .execute();
    }

    return {
      ...donation,
      amount: parseFloat(donation.amount),
      customFields: donation.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Donation creation failed:', error);
    throw error;
  }
}

export async function getDonations(filter: FilterInput): Promise<{ donations: Donation[]; total: number }> {
  try {
    const offset = (filter.page - 1) * filter.limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(donationsTable.tenantId, filter.tenantId)
    ];

    if (filter.search) {
      conditions.push(ilike(donorsTable.name, `%${filter.search}%`));
    }

    // Build complete query in one chain
    let baseQuery = db.select({
      donations: donationsTable,
      donor: donorsTable,
      campaign: campaignsTable
    })
      .from(donationsTable)
      .innerJoin(donorsTable, eq(donationsTable.donorId, donorsTable.id))
      .leftJoin(campaignsTable, eq(donationsTable.campaignId, campaignsTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    // Apply sorting
    let sortedQuery;
    if (filter.sortBy) {
      const sortColumn = filter.sortBy === 'donorName' ? donorsTable.name :
                        filter.sortBy === 'campaignName' ? campaignsTable.name :
                        filter.sortBy === 'amount' ? donationsTable.amount :
                        filter.sortBy === 'date' ? donationsTable.date :
                        donationsTable.date;
      
      sortedQuery = baseQuery.orderBy(filter.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
    } else {
      sortedQuery = baseQuery.orderBy(desc(donationsTable.date));
    }

    // Apply pagination
    const finalQuery = sortedQuery.limit(filter.limit).offset(offset);
    const results = await finalQuery.execute();

    // Get total count with same conditions
    const countQuery = db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(donationsTable)
      .innerJoin(donorsTable, eq(donationsTable.donorId, donorsTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    
    const countResult = await countQuery.execute();
    const total = countResult[0]?.count || 0;

    const donations: Donation[] = results.map(result => ({
      ...result.donations,
      amount: parseFloat(result.donations.amount),
      customFields: result.donations.customFields as Record<string, any> | null
    }));

    return { donations, total };
  } catch (error) {
    console.error('Get donations failed:', error);
    throw error;
  }
}

export async function getDonationById(id: number, tenantId: string): Promise<Donation | null> {
  try {
    const results = await db.select({
      donations: donationsTable,
      donor: donorsTable,
      campaign: campaignsTable
    })
      .from(donationsTable)
      .innerJoin(donorsTable, eq(donationsTable.donorId, donorsTable.id))
      .leftJoin(campaignsTable, eq(donationsTable.campaignId, campaignsTable.id))
      .where(and(
        eq(donationsTable.id, id),
        eq(donationsTable.tenantId, tenantId)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      ...result.donations,
      amount: parseFloat(result.donations.amount),
      customFields: result.donations.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Get donation by ID failed:', error);
    throw error;
  }
}

export async function updateDonation(input: UpdateDonationInput, tenantId: string): Promise<Donation> {
  try {
    // Get current donation to check for changes that affect campaign amount
    const currentDonation = await db.select()
      .from(donationsTable)
      .where(and(
        eq(donationsTable.id, input.id),
        eq(donationsTable.tenantId, tenantId)
      ))
      .execute();

    if (currentDonation.length === 0) {
      throw new Error('Donation not found or access denied');
    }

    const current = currentDonation[0];
    const oldAmount = parseFloat(current.amount);
    const oldCampaignId = current.campaignId;
    const oldStatus = current.status;

    // Verify donor exists if being updated
    if (input.donorId) {
      const donor = await db.select()
        .from(donorsTable)
        .where(and(
          eq(donorsTable.id, input.donorId),
          eq(donorsTable.tenantId, tenantId)
        ))
        .execute();

      if (donor.length === 0) {
        throw new Error('Donor not found or access denied');
      }
    }

    // Verify campaign exists if being updated
    if (input.campaignId !== undefined) {
      if (input.campaignId) {
        const campaign = await db.select()
          .from(campaignsTable)
          .where(and(
            eq(campaignsTable.id, input.campaignId),
            eq(campaignsTable.tenantId, tenantId)
          ))
          .execute();

        if (campaign.length === 0) {
          throw new Error('Campaign not found or access denied');
        }
      }
    }

    // Build update values
    const updateValues: any = { updatedAt: new Date() };
    if (input.donorId !== undefined) updateValues.donorId = input.donorId;
    if (input.campaignId !== undefined) updateValues.campaignId = input.campaignId;
    if (input.amount !== undefined) updateValues.amount = input.amount.toString();
    if (input.date !== undefined) updateValues.date = input.date;
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.paymentMethod !== undefined) updateValues.paymentMethod = input.paymentMethod;
    if (input.notes !== undefined) updateValues.notes = input.notes;
    if (input.customFields !== undefined) updateValues.customFields = input.customFields;

    // Update donation
    const result = await db.update(donationsTable)
      .set(updateValues)
      .where(eq(donationsTable.id, input.id))
      .returning()
      .execute();

    const updated = result[0];
    const newAmount = input.amount !== undefined ? input.amount : oldAmount;
    const newCampaignId = input.campaignId !== undefined ? input.campaignId : oldCampaignId;
    const newStatus = input.status !== undefined ? input.status : oldStatus;

    // Handle campaign amount updates
    // Remove from old campaign if it was 'Received' and had a campaign
    if (oldCampaignId && oldStatus === 'Received') {
      await db.update(campaignsTable)
        .set({
          currentAmountRaised: sql`${campaignsTable.currentAmountRaised} - ${oldAmount.toString()}`,
          updatedAt: new Date()
        })
        .where(eq(campaignsTable.id, oldCampaignId))
        .execute();
    }

    // Add to new campaign if it's 'Received' and has a campaign
    if (newCampaignId && newStatus === 'Received') {
      await db.update(campaignsTable)
        .set({
          currentAmountRaised: sql`${campaignsTable.currentAmountRaised} + ${newAmount.toString()}`,
          updatedAt: new Date()
        })
        .where(eq(campaignsTable.id, newCampaignId))
        .execute();
    }

    return {
      ...updated,
      amount: parseFloat(updated.amount),
      customFields: updated.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Donation update failed:', error);
    throw error;
  }
}

export async function deleteDonation(id: number, tenantId: string): Promise<void> {
  try {
    // Get donation to check if we need to update campaign amount
    const donations = await db.select()
      .from(donationsTable)
      .where(and(
        eq(donationsTable.id, id),
        eq(donationsTable.tenantId, tenantId)
      ))
      .execute();

    if (donations.length === 0) {
      throw new Error('Donation not found or access denied');
    }

    const donation = donations[0];

    // Delete donation
    await db.delete(donationsTable)
      .where(eq(donationsTable.id, id))
      .execute();

    // Update campaign's currentAmountRaised if donation was received and linked to campaign
    if (donation.campaignId && donation.status === 'Received') {
      await db.update(campaignsTable)
        .set({
          currentAmountRaised: sql`${campaignsTable.currentAmountRaised} - ${donation.amount}`,
          updatedAt: new Date()
        })
        .where(eq(campaignsTable.id, donation.campaignId))
        .execute();
    }
  } catch (error) {
    console.error('Donation deletion failed:', error);
    throw error;
  }
}

export async function getDonationsByDonor(donorId: number, tenantId: string): Promise<Donation[]> {
  try {
    // Verify donor exists and belongs to tenant
    const donor = await db.select()
      .from(donorsTable)
      .where(and(
        eq(donorsTable.id, donorId),
        eq(donorsTable.tenantId, tenantId)
      ))
      .execute();

    if (donor.length === 0) {
      throw new Error('Donor not found or access denied');
    }

    const results = await db.select()
      .from(donationsTable)
      .where(and(
        eq(donationsTable.donorId, donorId),
        eq(donationsTable.tenantId, tenantId)
      ))
      .orderBy(desc(donationsTable.date))
      .execute();

    return results.map(donation => ({
      ...donation,
      amount: parseFloat(donation.amount),
      customFields: donation.customFields as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Get donations by donor failed:', error);
    throw error;
  }
}

export async function getDonationsByCampaign(campaignId: number, tenantId: string): Promise<Donation[]> {
  try {
    // Verify campaign exists and belongs to tenant
    const campaign = await db.select()
      .from(campaignsTable)
      .where(and(
        eq(campaignsTable.id, campaignId),
        eq(campaignsTable.tenantId, tenantId)
      ))
      .execute();

    if (campaign.length === 0) {
      throw new Error('Campaign not found or access denied');
    }

    const results = await db.select()
      .from(donationsTable)
      .where(and(
        eq(donationsTable.campaignId, campaignId),
        eq(donationsTable.tenantId, tenantId)
      ))
      .orderBy(desc(donationsTable.date))
      .execute();

    return results.map(donation => ({
      ...donation,
      amount: parseFloat(donation.amount),
      customFields: donation.customFields as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Get donations by campaign failed:', error);
    throw error;
  }
}