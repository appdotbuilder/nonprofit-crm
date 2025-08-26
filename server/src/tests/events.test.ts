import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { createEvent } from '../handlers/events';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateEventInput = {
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Annual Fundraising Gala',
  description: 'Our biggest fundraising event of the year',
  date: new Date('2024-06-15T19:00:00Z'),
  location: '123 Main Street, City Hall',
  capacity: 200,
  customFields: { theme: 'formal', ticketPrice: 100 },
};

describe('createEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an event with all fields', async () => {
    const result = await createEvent(testInput);

    // Basic field validation
    expect(result.tenantId).toEqual(testInput.tenantId);
    expect(result.name).toEqual('Annual Fundraising Gala');
    expect(result.description).toEqual(testInput.description);
    expect(result.date).toEqual(testInput.date);
    expect(result.location).toEqual(testInput.location);
    expect(result.capacity).toEqual(200);
    expect(result.customFields).toEqual(testInput.customFields);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should save event to database', async () => {
    const result = await createEvent(testInput);

    // Query using proper drizzle syntax
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].tenantId).toEqual(testInput.tenantId);
    expect(events[0].name).toEqual('Annual Fundraising Gala');
    expect(events[0].description).toEqual(testInput.description);
    expect(events[0].date).toEqual(testInput.date);
    expect(events[0].location).toEqual(testInput.location);
    expect(events[0].capacity).toEqual(200);
    expect(events[0].customFields).toEqual(testInput.customFields);
    expect(events[0].createdAt).toBeInstanceOf(Date);
    expect(events[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should create event with minimal required fields', async () => {
    const minimalInput: CreateEventInput = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Simple Event',
      description: null,
      date: new Date('2024-07-01T10:00:00Z'),
      location: null,
      capacity: null,
      customFields: null,
    };

    const result = await createEvent(minimalInput);

    expect(result.tenantId).toEqual(minimalInput.tenantId);
    expect(result.name).toEqual('Simple Event');
    expect(result.description).toBeNull();
    expect(result.date).toEqual(minimalInput.date);
    expect(result.location).toBeNull();
    expect(result.capacity).toBeNull();
    expect(result.customFields).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should handle events with zero capacity', async () => {
    const zeroCapacityInput: CreateEventInput = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Private Meeting',
      description: 'Board members only',
      date: new Date('2024-08-01T14:00:00Z'),
      location: 'Conference Room A',
      capacity: 0, // Valid zero capacity
      customFields: null,
    };

    const result = await createEvent(zeroCapacityInput);

    expect(result.capacity).toEqual(0);
    expect(result.name).toEqual('Private Meeting');
  });

  it('should create multiple events for same tenant', async () => {
    const event1 = await createEvent(testInput);
    
    const secondInput: CreateEventInput = {
      tenantId: testInput.tenantId, // Same tenant
      name: 'Community Cleanup',
      description: 'Volunteer event for neighborhood cleanup',
      date: new Date('2024-09-15T09:00:00Z'),
      location: 'Central Park',
      capacity: 50,
      customFields: { volunteerHours: 4 },
    };

    const event2 = await createEvent(secondInput);

    expect(event1.tenantId).toEqual(event2.tenantId);
    expect(event1.id).not.toEqual(event2.id);
    expect(event1.name).not.toEqual(event2.name);

    // Verify both events exist in database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.tenantId, testInput.tenantId))
      .execute();

    expect(events).toHaveLength(2);
  });

  it('should create events for different tenants', async () => {
    const tenant1Event = await createEvent(testInput);

    const tenant2Input: CreateEventInput = {
      tenantId: '660e8400-e29b-41d4-a716-446655440001', // Different tenant
      name: 'Other Organization Event',
      description: 'Event for different tenant',
      date: new Date('2024-10-01T18:00:00Z'),
      location: 'Other Location',
      capacity: 100,
      customFields: null,
    };

    const tenant2Event = await createEvent(tenant2Input);

    expect(tenant1Event.tenantId).not.toEqual(tenant2Event.tenantId);
    expect(tenant1Event.id).not.toEqual(tenant2Event.id);

    // Verify tenant isolation
    const tenant1Events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.tenantId, testInput.tenantId))
      .execute();

    const tenant2Events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.tenantId, tenant2Input.tenantId))
      .execute();

    expect(tenant1Events).toHaveLength(1);
    expect(tenant2Events).toHaveLength(1);
    expect(tenant1Events[0].name).toEqual('Annual Fundraising Gala');
    expect(tenant2Events[0].name).toEqual('Other Organization Event');
  });

  it('should handle complex custom fields', async () => {
    const complexCustomFields = {
      eventType: 'gala',
      sponsorshipTiers: ['Gold', 'Silver', 'Bronze'],
      requirements: {
        dressCode: 'formal',
        ageRestriction: 21,
        specialNeeds: true
      },
      contactInfo: {
        coordinator: 'Jane Smith',
        phone: '555-0123',
        email: 'jane@example.com'
      }
    };

    const complexInput: CreateEventInput = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Complex Event',
      description: 'Event with complex custom fields',
      date: new Date('2024-11-15T20:00:00Z'),
      location: 'Grand Ballroom',
      capacity: 300,
      customFields: complexCustomFields,
    };

    const result = await createEvent(complexInput);

    expect(result.customFields).toEqual(complexCustomFields);

    // Verify custom fields are correctly stored as JSONB
    const dbEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(dbEvent[0].customFields).toEqual(complexCustomFields);
  });
});