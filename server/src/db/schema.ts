import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  uuid, 
  jsonb,
  pgEnum,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for status fields
export const campaignStatusEnum = pgEnum('campaign_status', ['Active', 'Completed', 'Cancelled', 'Planned']);
export const donationStatusEnum = pgEnum('donation_status', ['Pledged', 'Received', 'Cancelled', 'Refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Online', 'Other']);
export const organizationTypeEnum = pgEnum('organization_type', ['Grant Maker', 'Sponsor', 'Corporate Partner', 'Foundation', 'Government', 'Other']);
export const grantStatusEnum = pgEnum('grant_status', ['Applied', 'Under Review', 'Awarded', 'Declined', 'Completed', 'Cancelled']);
export const attendeeTypeEnum = pgEnum('attendee_type', ['Donor', 'Volunteer']);

// Donors table
export const donorsTable = pgTable('donors', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('donors_tenant_id_idx').on(table.tenantId),
  emailIdx: index('donors_email_idx').on(table.email),
}));

// Campaigns table
export const campaignsTable = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  goalAmount: numeric('goal_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmountRaised: numeric('current_amount_raised', { precision: 12, scale: 2 }).notNull().default('0'),
  status: campaignStatusEnum('status').notNull(),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('campaigns_tenant_id_idx').on(table.tenantId),
  statusIdx: index('campaigns_status_idx').on(table.status),
}));

// Donations table
export const donationsTable = pgTable('donations', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  donorId: integer('donor_id').notNull(),
  campaignId: integer('campaign_id'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  status: donationStatusEnum('status').notNull(),
  paymentMethod: paymentMethodEnum('payment_method'),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('donations_tenant_id_idx').on(table.tenantId),
  donorIdIdx: index('donations_donor_id_idx').on(table.donorId),
  campaignIdIdx: index('donations_campaign_id_idx').on(table.campaignId),
  statusIdx: index('donations_status_idx').on(table.status),
  dateIdx: index('donations_date_idx').on(table.date),
}));

// Volunteers table
export const volunteersTable = pgTable('volunteers', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  skills: text('skills'),
  availability: text('availability'),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('volunteers_tenant_id_idx').on(table.tenantId),
  emailIdx: index('volunteers_email_idx').on(table.email),
}));

// Events table
export const eventsTable = pgTable('events', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  location: text('location'),
  capacity: integer('capacity'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('events_tenant_id_idx').on(table.tenantId),
  dateIdx: index('events_date_idx').on(table.date),
}));

// Organizations table
export const organizationsTable = pgTable('organizations', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  type: organizationTypeEnum('type').notNull(),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('organizations_tenant_id_idx').on(table.tenantId),
  typeIdx: index('organizations_type_idx').on(table.type),
}));

// Grants table
export const grantsTable = pgTable('grants', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  organizationId: integer('organization_id').notNull(),
  grantName: text('grant_name').notNull(),
  applicationDate: timestamp('application_date'),
  awardDate: timestamp('award_date'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: grantStatusEnum('status').notNull(),
  reportingRequirements: text('reporting_requirements'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('grants_tenant_id_idx').on(table.tenantId),
  organizationIdIdx: index('grants_organization_id_idx').on(table.organizationId),
  statusIdx: index('grants_status_idx').on(table.status),
}));

// Event Attendees junction table
export const eventAttendeesTable = pgTable('event_attendees', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  eventId: integer('event_id').notNull(),
  attendeeId: integer('attendee_id').notNull(),
  attendeeType: attendeeTypeEnum('attendee_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('event_attendees_tenant_id_idx').on(table.tenantId),
  eventIdIdx: index('event_attendees_event_id_idx').on(table.eventId),
  attendeeIdx: index('event_attendees_attendee_idx').on(table.attendeeId, table.attendeeType),
}));

// Custom Data table for generic custom data entity
export const customDataTable = pgTable('custom_data', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  dataType: text('data_type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('custom_data_tenant_id_idx').on(table.tenantId),
  dataTypeIdx: index('custom_data_data_type_idx').on(table.dataType),
}));

// Relations
export const donorsRelations = relations(donorsTable, ({ many }) => ({
  donations: many(donationsTable),
  eventAttendees: many(eventAttendeesTable),
}));

export const campaignsRelations = relations(campaignsTable, ({ many }) => ({
  donations: many(donationsTable),
}));

export const donationsRelations = relations(donationsTable, ({ one }) => ({
  donor: one(donorsTable, {
    fields: [donationsTable.donorId],
    references: [donorsTable.id],
  }),
  campaign: one(campaignsTable, {
    fields: [donationsTable.campaignId],
    references: [campaignsTable.id],
  }),
}));

export const volunteersRelations = relations(volunteersTable, ({ many }) => ({
  eventAttendees: many(eventAttendeesTable),
}));

export const eventsRelations = relations(eventsTable, ({ many }) => ({
  attendees: many(eventAttendeesTable),
}));

export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
  grants: many(grantsTable),
}));

export const grantsRelations = relations(grantsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [grantsTable.organizationId],
    references: [organizationsTable.id],
  }),
}));

export const eventAttendeesRelations = relations(eventAttendeesTable, ({ one }) => ({
  event: one(eventsTable, {
    fields: [eventAttendeesTable.eventId],
    references: [eventsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Donor = typeof donorsTable.$inferSelect;
export type NewDonor = typeof donorsTable.$inferInsert;

export type Campaign = typeof campaignsTable.$inferSelect;
export type NewCampaign = typeof campaignsTable.$inferInsert;

export type Donation = typeof donationsTable.$inferSelect;
export type NewDonation = typeof donationsTable.$inferInsert;

export type Volunteer = typeof volunteersTable.$inferSelect;
export type NewVolunteer = typeof volunteersTable.$inferInsert;

export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;

export type Organization = typeof organizationsTable.$inferSelect;
export type NewOrganization = typeof organizationsTable.$inferInsert;

export type Grant = typeof grantsTable.$inferSelect;
export type NewGrant = typeof grantsTable.$inferInsert;

export type EventAttendee = typeof eventAttendeesTable.$inferSelect;
export type NewEventAttendee = typeof eventAttendeesTable.$inferInsert;

export type CustomData = typeof customDataTable.$inferSelect;
export type NewCustomData = typeof customDataTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  donors: donorsTable,
  campaigns: campaignsTable,
  donations: donationsTable,
  volunteers: volunteersTable,
  events: eventsTable,
  organizations: organizationsTable,
  grants: grantsTable,
  eventAttendees: eventAttendeesTable,
  customData: customDataTable,
};