import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createDonorInputSchema,
  updateDonorInputSchema,
  createCampaignInputSchema,
  updateCampaignInputSchema,
  createDonationInputSchema,
  updateDonationInputSchema,
  createVolunteerInputSchema,
  updateVolunteerInputSchema,
  createEventInputSchema,
  updateEventInputSchema,
  createEventAttendeeInputSchema,
  createOrganizationInputSchema,
  updateOrganizationInputSchema,
  createGrantInputSchema,
  updateGrantInputSchema,
  createCustomDataInputSchema,
  updateCustomDataInputSchema,
  filterSchema,
  tenantIdSchema,
  attendeeTypeSchema,
} from './schema';

// Import all handlers
import {
  createDonor,
  getDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
} from './handlers/donors';

import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from './handlers/campaigns';

import {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  getDonationsByDonor,
  getDonationsByCampaign,
} from './handlers/donations';

import {
  createVolunteer,
  getVolunteers,
  getVolunteerById,
  updateVolunteer,
  deleteVolunteer,
} from './handlers/volunteers';

import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addEventAttendee,
  removeEventAttendee,
  getEventAttendees,
} from './handlers/events';

import {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from './handlers/organizations';

import {
  createGrant,
  getGrants,
  getGrantById,
  updateGrant,
  deleteGrant,
  getGrantsByOrganization,
} from './handlers/grants';

import {
  createCustomData,
  getCustomData,
  getCustomDataById,
  updateCustomData,
  deleteCustomData,
  getCustomDataByType,
} from './handlers/custom-data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Donor routes
  donors: router({
    create: publicProcedure
      .input(createDonorInputSchema)
      .mutation(({ input }) => createDonor(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getDonors(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getDonorById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateDonorInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateDonor(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteDonor(input.id, input.tenantId)),
  }),

  // Campaign routes
  campaigns: router({
    create: publicProcedure
      .input(createCampaignInputSchema)
      .mutation(({ input }) => createCampaign(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getCampaigns(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getCampaignById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateCampaignInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateCampaign(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteCampaign(input.id, input.tenantId)),
  }),

  // Donation routes
  donations: router({
    create: publicProcedure
      .input(createDonationInputSchema)
      .mutation(({ input }) => createDonation(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getDonations(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getDonationById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateDonationInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateDonation(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteDonation(input.id, input.tenantId)),
    
    getByDonor: publicProcedure
      .input(z.object({ donorId: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getDonationsByDonor(input.donorId, input.tenantId)),
    
    getByCampaign: publicProcedure
      .input(z.object({ campaignId: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getDonationsByCampaign(input.campaignId, input.tenantId)),
  }),

  // Volunteer routes
  volunteers: router({
    create: publicProcedure
      .input(createVolunteerInputSchema)
      .mutation(({ input }) => createVolunteer(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getVolunteers(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getVolunteerById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateVolunteerInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateVolunteer(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteVolunteer(input.id, input.tenantId)),
  }),

  // Event routes
  events: router({
    create: publicProcedure
      .input(createEventInputSchema)
      .mutation(({ input }) => createEvent(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getEvents(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getEventById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateEventInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateEvent(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteEvent(input.id, input.tenantId)),
    
    addAttendee: publicProcedure
      .input(createEventAttendeeInputSchema)
      .mutation(({ input }) => addEventAttendee(input)),
    
    removeAttendee: publicProcedure
      .input(z.object({ 
        eventId: z.number(), 
        attendeeId: z.number(), 
        attendeeType: attendeeTypeSchema,
        tenantId: tenantIdSchema 
      }))
      .mutation(({ input }) => removeEventAttendee(input.eventId, input.attendeeId, input.attendeeType, input.tenantId)),
    
    getAttendees: publicProcedure
      .input(z.object({ eventId: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getEventAttendees(input.eventId, input.tenantId)),
  }),

  // Organization routes
  organizations: router({
    create: publicProcedure
      .input(createOrganizationInputSchema)
      .mutation(({ input }) => createOrganization(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getOrganizations(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getOrganizationById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateOrganizationInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateOrganization(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteOrganization(input.id, input.tenantId)),
  }),

  // Grant routes
  grants: router({
    create: publicProcedure
      .input(createGrantInputSchema)
      .mutation(({ input }) => createGrant(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getGrants(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getGrantById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateGrantInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateGrant(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteGrant(input.id, input.tenantId)),
    
    getByOrganization: publicProcedure
      .input(z.object({ organizationId: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getGrantsByOrganization(input.organizationId, input.tenantId)),
  }),

  // Custom Data routes
  customData: router({
    create: publicProcedure
      .input(createCustomDataInputSchema)
      .mutation(({ input }) => createCustomData(input)),
    
    list: publicProcedure
      .input(filterSchema)
      .query(({ input }) => getCustomData(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .query(({ input }) => getCustomDataById(input.id, input.tenantId)),
    
    update: publicProcedure
      .input(updateCustomDataInputSchema.extend({ tenantId: tenantIdSchema }))
      .mutation(({ input }) => updateCustomData(input, input.tenantId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number(), tenantId: tenantIdSchema }))
      .mutation(({ input }) => deleteCustomData(input.id, input.tenantId)),
    
    getByType: publicProcedure
      .input(z.object({ dataType: z.string(), tenantId: tenantIdSchema }))
      .query(({ input }) => getCustomDataByType(input.dataType, input.tenantId)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();