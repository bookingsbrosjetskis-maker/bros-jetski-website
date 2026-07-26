import { randomBytes } from "crypto";
import type { Booking } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * The Transport Canada Rental Boat Safety Checklist for Personal Watercraft
 * (PWC), transcribed from the official form. The customer completes this online
 * after booking as a pre-ride acknowledgement.
 *
 * IMPORTANT (legal): a completed checklist is valid proof of competency under
 * the Competency of Operators of Pleasure Craft Regulations only when signed by
 * BOTH the customer and the rental agent AND carried on board for the rental.
 * The online version is a pre-briefing; the agent co-signs at the dock.
 */

export type ChecklistItem = { id: string; text: string };
export type ChecklistSection = { id: string; heading: string; items: ChecklistItem[] };

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "before",
    heading: "Before you go",
    items: [
      { id: "b1", text: "There are enough lifejackets of the proper size for all people on board." },
      { id: "b2", text: "I understand that each person on board should wear a lifejacket at all times." },
      { id: "b3", text: "The required safety equipment for this PWC is on board, in good working condition and easy to reach." },
      { id: "b4", text: "I understand when and how to use the safety equipment on board." },
      { id: "b5", text: "I must be at least 16 years old to operate this PWC (and at least 18 to rent from us)." },
      { id: "b6", text: "The rental agent reviewed a chart or map of the area and showed me the suggested route for the rental period." },
      { id: "b7", text: "I have been made aware of any buoys and signs in the area and know their meaning." },
      { id: "b8", text: "I have been informed of local hazards such as shallow water, submerged objects, currents, tides and weather patterns." },
      { id: "b9", text: "I have been made aware of local rules and restrictions, such as speed limits and off-limit areas." },
    ],
  },
  {
    id: "water",
    heading: "On the water",
    items: [
      { id: "w1", text: "When crossing the path of another boat, I will yield to the boat on my right (starboard)." },
      { id: "w2", text: "If there is a threat of a collision, I will slow down, steer away and stop." },
      { id: "w3", text: "When I meet another boat head-on I will steer to the right (starboard)." },
      { id: "w4", text: "When overtaking another boat, I will pass to either side at a safe distance." },
      { id: "w5", text: "I will yield to all non-motorized boats, including sailboats, canoes and kayaks, and stay clear of large commercial vessels." },
      { id: "w6", text: "I will keep constant watch for other boats, hazards to navigation and weather changes." },
      { id: "w7", text: "I will obey all signs and buoys." },
      { id: "w8", text: "I understand that alcohol and boating do not mix and may affect my judgement and ability to operate this PWC safely." },
      { id: "w9", text: "I will not operate this PWC, or allow anyone else to, while under the influence of alcohol or other drugs." },
      { id: "w10", text: "I will operate this PWC at speeds that are safe for conditions." },
      { id: "w11", text: "I will remain clear of swimmers and avoid creating any hazard that may affect people, wildlife, property and other boats." },
      { id: "w12", text: "I will not allow swimming, diving, sliding or jumping from or near the PWC unless the motor is off and the engine cut-off device is disconnected." },
      { id: "w13", text: "I know what to do if dangerous weather occurs." },
    ],
  },
  {
    id: "emergency",
    heading: "In an emergency",
    items: [
      { id: "e1", text: "I know what to do if anyone falls overboard, if the engine breaks down, or if the PWC runs aground or capsizes." },
      { id: "e2", text: "I know that I must stop and offer assistance in case of an accident or distress call." },
      { id: "e3", text: "I know how to get help for a mechanical breakdown or other emergency." },
    ],
  },
  {
    id: "vessel",
    heading: "Vessel specific",
    items: [
      { id: "v1", text: "I know how to start and stop the engine, operate the throttle, and safely steer this PWC." },
      { id: "v2", text: "I have been shown how to safely fuel this PWC." },
      { id: "v3", text: "I will not operate this PWC unless the shut-off cord is securely attached to my wrist, lifejacket or clothing so the engine stops if I fall overboard." },
      { id: "v4", text: "I will avoid sharp turns and manoeuvres that make it difficult for others to avoid colliding with me or to understand where I am going." },
      { id: "v5", text: "I will not ride at night, as I understand this PWC does not have navigation lights." },
      { id: "v6", text: "This PWC's unique handling characteristics have been explained to me." },
      { id: "v7", text: "I understand that stopping the engine will not stop the forward motion of the PWC, and that I lose steering control when I release the throttle or the engine is off." },
      { id: "v8", text: "I understand that the jet drive intake can pull loose items into the engine, so I will keep loose objects away from the intake grate." },
      { id: "v9", text: "I will respect the maximum load for this PWC." },
    ],
  },
  {
    id: "agreement",
    heading: "Agreement",
    items: [
      { id: "a1", text: "I agree to follow all applicable boating laws and regulations and will operate this boat in a safe manner." },
      { id: "a2", text: "I will not allow anyone else to operate this boat unless they have a valid proof of competency and meet the age and horsepower restrictions." },
      { id: "a3", text: "I have been made aware of any additional requirements specific to this rental agency and I agree to follow them." },
    ],
  },
];

/** Short free-text details the customer confirms (from the form's rider block). */
export type ChecklistDetailField = { id: string; label: string; required: boolean };
export const CHECKLIST_DETAIL_FIELDS: ChecklistDetailField[] = [
  { id: "totalOnboard", label: "Total people on board", required: true },
  { id: "emergencyContactName", label: "Emergency contact name", required: true },
  { id: "emergencyContactPhone", label: "Emergency contact phone", required: true },
];

/** Every checklist item id, used to require a fully completed checklist. */
export const ALL_ITEM_IDS: string[] = CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

export type ChecklistResponses = {
  items: Record<string, boolean>;
  details: Record<string, string>;
};

/** Find or create the SafetyChecklist row for a booking, returning its token.
 * Idempotent so both post-payment confirm paths can call it safely. */
export async function ensureChecklist(booking: Pick<Booking, "id">) {
  const existing = await prisma.safetyChecklist.findUnique({ where: { bookingId: booking.id } });
  if (existing) return existing;
  return prisma.safetyChecklist.create({
    data: { bookingId: booking.id, token: randomBytes(24).toString("base64url") },
  });
}
