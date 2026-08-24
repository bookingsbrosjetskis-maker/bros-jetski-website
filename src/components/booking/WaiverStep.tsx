"use client";

import { Input, Label } from "@/components/ui";

/** The discrete acknowledgements from the client's agreement. All must be
 * checked to sign. Kept as a keyed object so the wizard can gate on "all true"
 * without a prop per checkbox. */
export type Acknowledgements = {
  legal: boolean;
  id: boolean;
  liability: boolean;
  deposit: boolean;
  terms: boolean;
};

export const EMPTY_ACKS: Acknowledgements = {
  legal: false,
  id: false,
  liability: false,
  deposit: false,
  terms: false,
};

const ACK_LABELS: { key: keyof Acknowledgements; text: string }[] = [
  {
    key: "legal",
    text: "I meet all legal requirements to operate a personal watercraft and will follow all safety instructions.",
  },
  {
    key: "id",
    text: "I will present valid government-issued photo ID at the dock.",
  },
  {
    key: "liability",
    text: "I understand that no security deposit does not mean no liability for damages.",
  },
  {
    key: "deposit",
    text: "I understand my booking deposit is refunded if I cancel 12+ hours ahead, and forfeited for a no-show or a late cancellation. If Bros Jetskis Rental cancels, my deposit is not forfeited.",
  },
  {
    key: "terms",
    text: "I have read and agree to all terms above. Typing my full legal name constitutes my electronic signature.",
  },
];

export default function WaiverStep({
  waiverText,
  dob,
  address,
  emergencyName,
  emergencyPhone,
  signedName,
  acks,
  onDob,
  onAddress,
  onEmergencyName,
  onEmergencyPhone,
  onSignedName,
  onAck,
}: {
  waiverText: string;
  dob: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  signedName: string;
  acks: Acknowledgements;
  onDob: (v: string) => void;
  onAddress: (v: string) => void;
  onEmergencyName: (v: string) => void;
  onEmergencyPhone: (v: string) => void;
  onSignedName: (v: string) => void;
  onAck: (key: keyof Acknowledgements, v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div
        className="max-h-72 overflow-y-auto rounded-xl border border-outline-variant bg-surface-low p-4 sm:max-h-80 sm:p-5"
        tabIndex={0}
        aria-label="Liability waiver text"
      >
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-muted [&_strong]:text-cyan">
          {waiverText}
        </pre>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="waiver-dob">Date of birth</Label>
          <Input
            id="waiver-dob"
            type="date"
            value={dob}
            onChange={(e) => onDob(e.target.value)}
            autoComplete="bday"
          />
        </div>
        <div>
          <Label htmlFor="waiver-address">Home address</Label>
          <Input
            id="waiver-address"
            value={address}
            onChange={(e) => onAddress(e.target.value)}
            placeholder="Street, city, province"
            autoComplete="street-address"
          />
        </div>
        <div>
          <Label htmlFor="waiver-ec-name">Emergency contact name</Label>
          <Input
            id="waiver-ec-name"
            value={emergencyName}
            onChange={(e) => onEmergencyName(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div>
          <Label htmlFor="waiver-ec-phone">Emergency contact phone</Label>
          <Input
            id="waiver-ec-phone"
            type="tel"
            value={emergencyPhone}
            onChange={(e) => onEmergencyPhone(e.target.value)}
            placeholder="(000) 000-0000"
            autoComplete="tel"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="waiver-signature">
          Type your full legal name to sign
        </Label>
        <Input
          id="waiver-signature"
          value={signedName}
          onChange={(e) => onSignedName(e.target.value)}
          placeholder="e.g. Jordan A. Rivers"
          autoComplete="name"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Waiver acknowledgements</legend>
        {ACK_LABELS.map(({ key, text }) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-4 transition-colors has-[:checked]:border-cyan has-[:checked]:bg-cyan/5"
          >
            <input
              type="checkbox"
              checked={acks[key]}
              onChange={(e) => onAck(key, e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-cyan"
            />
            <span className="text-sm leading-relaxed text-ink-muted">{text}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
