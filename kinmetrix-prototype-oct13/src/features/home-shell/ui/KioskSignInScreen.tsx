import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import crestUrl from "../../../assets/northridge-athletics.jpg";
import { Button } from "../../../shared/primitives/buttons/Button";
import { IconButton } from "../../../shared/primitives/buttons/IconButton";
import { Field } from "../../../shared/primitives/form/Field";
import { Typography } from "../../../shared/primitives/typography/Typography";
import { useAppShell } from "./AppShellContext";
import { KioskCodeMark } from "./KioskCodeMark";

const KIOSK_RECORD_DATE = "March 14, 1998";

type KioskPhase = "check-in" | "confirm" | "pin";

function keepDigits(event: ChangeEvent<HTMLInputElement>) {
  const field = event.currentTarget;
  const next = field.value.replace(/\D/g, "").slice(0, field.maxLength);
  if (next !== field.value) {
    field.value = next;
  }
  if (next.length < field.maxLength) {
    return;
  }
  const sibling = field.nextElementSibling;
  if (sibling instanceof HTMLInputElement) {
    sibling.focus();
  }
}

function StaffGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64L4.86 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
      />
    </svg>
  );
}

function TeamCaption({
  name,
  compact = false,
}: {
  name: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "kiosk-caption" : "kiosk-place"}>
      <span className={compact ? "kiosk-crest is-compact" : "kiosk-crest"}>
        <img src={crestUrl} alt="" />
      </span>
      <Typography variant={compact ? "heading" : "title"} as="p">
        {name}
      </Typography>
    </div>
  );
}

function KioskHeader({
  teamName,
  trailing,
}: {
  teamName: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="kiosk-header">
      <TeamCaption name={teamName} />
      {trailing ? <div className="kiosk-header-trailing">{trailing}</div> : null}
    </header>
  );
}

interface RecordProps {
  teamName: string;
  name: string;
  dateOfBirth: string;
  viaPhone: boolean;
  waiverSigned: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

function KioskConfirm({
  teamName,
  name,
  dateOfBirth,
  viaPhone,
  waiverSigned,
  onConfirm,
  onReject,
}: RecordProps) {
  return (
    <section className="kiosk-outcome kiosk-outcome--confirm">
      <KioskHeader teamName={teamName} />
      <div className="kiosk-outcome-body">
        <div className="kiosk-sheet kiosk-sheet--confirm">
          <header className="kiosk-confirm-head">
            <Typography variant="display" as="h1">
              Is this you?
            </Typography>
          <Typography variant="muted">
            Confirm your name before you sign in on this tablet.
          </Typography>
        </header>
        <div className="kiosk-identity-card">
          <dl className="kiosk-identity-facts">
            <div className="kiosk-identity-fact kiosk-identity-fact--primary">
              <Typography variant="label" as="dt">
                Name
              </Typography>
              <Typography variant="heading" as="dd">
                {name}
              </Typography>
            </div>
            {viaPhone ? null : (
              <div className="kiosk-identity-fact">
                <Typography variant="label" as="dt">
                  Date of birth
                </Typography>
                <Typography variant="title" as="dd">
                  {dateOfBirth}
                </Typography>
              </div>
            )}
          </dl>
          {viaPhone ? (
            <Typography variant="muted" className="kiosk-identity-note">
              Kinmetrix app on your phone
            </Typography>
          ) : null}
          {waiverSigned ? null : (
            <Typography variant="helper" className="kiosk-identity-note">
              Waiver not signed yet. You can continue. Sign on your phone before
              you start an exercise.
            </Typography>
          )}
        </div>
          <div className="kiosk-actions kiosk-confirm-actions">
            <Button
              variant="primary"
              fullWidth
              className="kiosk-action"
              onClick={onConfirm}
            >
              Yes, this is me
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="kiosk-action"
              onClick={onReject}
            >
              Not me
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PinProps {
  teamName: string;
  onBack: () => void;
  onAccept: () => void;
}

function KioskPin({ teamName, onBack, onAccept }: PinProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  const handlePin = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
    setError("");
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pin.length === 4) {
        onAccept();
        return;
      }
      setError("Enter the 4-digit staff PIN.");
      pinRef.current?.focus();
    },
    [onAccept, pin],
  );

  return (
    <section className="kiosk-outcome">
      <KioskHeader teamName={teamName} />
      <div className="kiosk-outcome-body">
        <div className="kiosk-sheet">
          <Typography variant="display" as="h1">
            Staff sign-in
          </Typography>
        <Typography variant="muted">
          This PIN opens team configuration. It does not open a member's home.
        </Typography>
        <form className="kiosk-pin-form" onSubmit={handleSubmit} noValidate>
          <div>
            <Field
              className={error ? "kiosk-pin is-invalid" : "kiosk-pin"}
              label="PIN"
            >
              <input
                ref={pinRef}
                name="pin"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={pin}
                aria-invalid={error !== ""}
                aria-describedby={error ? "kiosk-pin-error" : undefined}
                onChange={handlePin}
              />
            </Field>
            {error ? (
              <p className="kiosk-error" id="kiosk-pin-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="kiosk-actions">
            <Button
              variant="primary"
              fullWidth
              className="kiosk-action"
              type="submit"
            >
              Open team configuration
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="kiosk-action"
              type="button"
              onClick={onBack}
            >
              Back
            </Button>
          </div>
        </form>
        </div>
      </div>
    </section>
  );
}

export function KioskSignInScreen() {
  const { teamName, kioskMember, leaveTeamView, openKioskMember } =
    useAppShell();
  const [phase, setPhase] = useState<KioskPhase>("check-in");
  const [viaPhone, setViaPhone] = useState(false);
  const [formGeneration, setFormGeneration] = useState(0);

  const handleStaff = useCallback(() => {
    setPhase("pin");
  }, []);

  const handleAcceptPin = useCallback(() => {
    leaveTeamView();
  }, [leaveTeamView]);

  const handleConnect = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViaPhone(false);
    setPhase("confirm");
  }, []);

  const handleScan = useCallback(() => {
    setViaPhone(true);
    setPhase("confirm");
  }, []);

  const handleConfirm = useCallback(() => {
    openKioskMember("home");
  }, [openKioskMember]);

  const handleReset = useCallback(() => {
    setViaPhone(false);
    setFormGeneration((generation) => generation + 1);
    setPhase("check-in");
  }, []);

  return (
    <>
      <section className="kiosk" hidden={phase !== "check-in"}>
        <KioskHeader
          teamName={teamName}
          trailing={
            <div className="kiosk-staff-wrap">
              <Typography variant="label" className="muted kiosk-staff-label">
                Staff only
              </Typography>
              <IconButton
                className="kiosk-staff"
                aria-label="Staff only: open team configuration"
                onClick={handleStaff}
              >
                <StaffGear />
              </IconButton>
            </div>
          }
        />
        <div className="kiosk-intro">
          <Typography variant="display" as="h1">
            Sign in to start
          </Typography>
          <Typography variant="muted">
            Welcome. Choose how you would like to sign in.
          </Typography>
        </div>
        <div className="kiosk-split">
          <section className="kiosk-pass">
            <div className="kiosk-heading">
              <Typography variant="title" as="h2">
                with your phone
              </Typography>
              <Typography variant="muted">
                Open the Kinmetrix app and scan this code.
              </Typography>
            </div>
            <div className="kiosk-main kiosk-pass-stack">
              <button
                className="kiosk-qr"
                type="button"
                aria-label="On-screen Kinmetrix code. Point the Kinmetrix app at it."
                onClick={handleScan}
              >
                <KioskCodeMark />
              </button>
            </div>
          </section>
          <form
            className="kiosk-desk"
            key={formGeneration}
            onSubmit={handleConnect}
            noValidate
          >
            <div className="kiosk-heading">
              <Typography variant="title" as="h2">
                with your name
              </Typography>
              <Typography variant="muted">
                Enter last name and date of birth from your record.
              </Typography>
            </div>
            <div className="kiosk-main kiosk-fields">
              <Field label="Last name">
                <input
                  name="last"
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
              </Field>
              <div>
                <span className="kiosk-date-label">Date of birth</span>
                <div className="kiosk-date">
                  <input
                    name="month"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="MM"
                    autoComplete="off"
                    aria-label="Month"
                    onChange={keepDigits}
                  />
                  <input
                    name="day"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="DD"
                    autoComplete="off"
                    aria-label="Day"
                    onChange={keepDigits}
                  />
                  <input
                    name="year"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="YYYY"
                    autoComplete="off"
                    aria-label="Year"
                    onChange={keepDigits}
                  />
                </div>
              </div>
            </div>
            <div className="kiosk-band">
              <Button
                variant="primary"
                fullWidth
                className="kiosk-action"
                type="submit"
              >
                Find my record
              </Button>
              <Typography variant="muted">
                New here? Ask at the desk.
              </Typography>
            </div>
          </form>
        </div>
      </section>
      {phase === "confirm" ? (
        <KioskConfirm
          teamName={teamName}
          name={kioskMember.name}
          dateOfBirth={KIOSK_RECORD_DATE}
          viaPhone={viaPhone}
          waiverSigned={kioskMember.waiverSigned}
          onConfirm={handleConfirm}
          onReject={handleReset}
        />
      ) : null}
      {phase === "pin" ? (
        <KioskPin
          teamName={teamName}
          onBack={handleReset}
          onAccept={handleAcceptPin}
        />
      ) : null}
    </>
  );
}
