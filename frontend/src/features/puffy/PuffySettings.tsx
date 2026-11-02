import { useId, useRef, useState } from "react";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { BlobMascot } from "./BlobMascot";
import { imageFileToDataUrl, type ImageErrorCode } from "./imageUtils";
import { ImageMascot } from "./ImageMascot";
import { MASCOTS, PALETTE_OPTIONS, mascotVars, varsToStyle, type MascotEntry } from "./mascots";
import type { MenuStrings } from "./menuStrings";
import { PuffyMascot } from "./PuffyMascot";
import { IDLE_OPTIONS, type PuffySettings as Settings } from "./usePuffySettings";
import "./puffy-menu.css";

interface Props {
  m: MenuStrings;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

export function PuffySettings({ m, settings, onChange, onReset }: Props) {
  const mascotLabelId = useId();
  const paletteLabelId = useId();
  const behaviorLabelId = useId();
  const idleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<ImageErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = MASCOTS.find((x) => x.id === settings.mascotId) ?? MASCOTS[0];
  const choice = { mascotId: settings.mascotId, palette: settings.palette, customImage: settings.customImage };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const res = await imageFileToDataUrl(file);
    setBusy(false);
    if (res.ok) {
      setImageError(null);
      onChange({ customImage: res.dataUrl, mascotId: "custom" });
    } else {
      setImageError(res.error);
    }
  };

  const pick = (entry: MascotEntry) => {
    if (entry.kind === "image" && !settings.customImage) { fileRef.current?.click(); return; }
    onChange({ mascotId: entry.id });
  };

  const preview = (entry: MascotEntry) => {
    if (entry.kind === "drop") return <PuffyMascot palette={settings.palette} mood="neutral" talking={false} bubble={false} />;
    if (entry.kind === "blob") return <BlobMascot entry={entry} mood="neutral" talking={false} bubble={false} />;
    if (settings.customImage) return <ImageMascot src={settings.customImage} mood="neutral" />;
    return <span className="pm-upload-icon"><ImagePlus size={26} aria-hidden="true" /></span>;
  };

  return (
    <div className="pm-settings">
      <section aria-labelledby={mascotLabelId}>
        <h3 id={mascotLabelId}>{m.mascot}</h3>
        <p className="pm-hint">{m.mascotHint}</p>
        <div className="pm-grid" role="radiogroup" aria-labelledby={mascotLabelId}>
          {MASCOTS.map((entry) => {
            const active = entry.id === selected.id;
            return (
              <button key={entry.id} type="button" role="radio" aria-checked={active} className="pm-card" onClick={() => pick(entry)}>
                <span className="pm-card__preview" style={varsToStyle(mascotVars(entry, choice))}>{preview(entry)}</span>
                <span className="pm-card__name">{entry.kind === "image" ? m.customMascot : entry.name}</span>
                {active && <Check className="pm-card__check" size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <p className="pm-hint pm-hint--tight">{m.imageHint}</p>
        {imageError && <p role="alert" className="pm-error">{m.imageError[imageError]}</p>}

        {selected.kind === "drop" && (
          <div className="pm-subrow">
            <span id={paletteLabelId} className="pm-sublabel">{m.palette}</span>
            <div className="pm-palettes" role="radiogroup" aria-labelledby={paletteLabelId}>
              {PALETTE_OPTIONS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={settings.palette === p.id} className="pm-chip"
                  onClick={() => onChange({ palette: p.id })}>
                  <span className="pm-swatch" style={{ background: `linear-gradient(135deg, ${p.lt}, ${p.base} 55%, ${p.dk})` }} aria-hidden="true" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.kind === "image" && (
          <div className="pm-subrow pm-subrow--stack">
            <div className="pm-actions">
              <button type="button" className="button button--secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={14} aria-hidden="true" /> {m.changeImage}
              </button>
              <button type="button" className="button button--secondary" onClick={() => { setImageError(null); onChange({ customImage: null, mascotId: "catdrop" }); }}>
                <Trash2 size={14} aria-hidden="true" /> {m.removeImage}
              </button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden aria-label={m.uploadImage}
          onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </section>

      <section aria-labelledby={behaviorLabelId}>
        <h3 id={behaviorLabelId}>{m.behavior}</h3>
        <SwitchRow label={m.autoSpeak} hint={m.autoSpeakHint} checked={settings.autoSpeak} onChange={(v) => onChange({ autoSpeak: v })} />
        <div className="pm-row">
          <label className="pm-row__text" htmlFor={idleId}><span className="pm-row__label">{m.idleLabel}</span></label>
          <select id={idleId} className="pm-select" value={settings.idleSeconds} onChange={(e) => onChange({ idleSeconds: Number(e.target.value) })}>
            {IDLE_OPTIONS.map((s) => <option key={s} value={s}>{m.idleOption(s)}</option>)}
          </select>
        </div>
        <SwitchRow label={m.startOpen} hint={m.startOpenHint} checked={settings.startOpen} onChange={(v) => onChange({ startOpen: v })} />
      </section>

      <button type="button" className="button button--secondary pm-reset" onClick={onReset}>{m.reset}</button>
    </div>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="pm-row">
      <div className="pm-row__text">
        <span id={`${id}-l`} className="pm-row__label">{label}</span>
        <span id={`${id}-h`} className="pm-hint pm-hint--tight">{hint}</span>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={`${id}-h`}
        className="pm-switch" onClick={() => onChange(!checked)}>
        <span className="pm-switch__thumb" />
      </button>
    </div>
  );
}
