import {
  COMMAND_MODE_DEFINITIONS,
  COMMAND_MODE_ORDER,
  type CommandModeId,
  type ModeSuggestion,
} from "@/lib/command-modes";

type CommandModeHeaderProps = {
  selectedMode: CommandModeId;
  suggestion: ModeSuggestion;
  manualOverride: boolean;
  onSelectMode: (mode: CommandModeId) => void;
  onUseSuggested: () => void;
};

export function CommandModeHeader({
  selectedMode,
  suggestion,
  manualOverride,
  onSelectMode,
  onUseSuggested,
}: CommandModeHeaderProps) {
  const selected = COMMAND_MODE_DEFINITIONS[selectedMode];
  const suggested = COMMAND_MODE_DEFINITIONS[suggestion.mode];

  return (
    <section
      className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-5"
      aria-labelledby="command-mode-heading"
      data-testid="command-mode-header"
      data-command-mode={selectedMode}
      data-suggested-mode={suggestion.mode}
      data-mode-confidence={suggestion.confidence}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Command mode
          </p>
          <h2
            id="command-mode-heading"
            className="mt-1 text-xl font-semibold text-[var(--admin-ink)]"
          >
            {selected.summaryHeading}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">{selected.purpose}</p>
          <p className="mt-2 text-sm text-[var(--admin-ink)]" data-testid="command-mode-local-time">
            Local time {suggestion.branchLocalTimeLabel} ({suggestion.timeZone})
          </p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]" data-testid="command-mode-suggestion-reason">
            Suggested {suggested.label}: {suggestion.reason}
          </p>
          {manualOverride ? (
            <p className="mt-1 text-sm font-medium text-[var(--admin-ink)]" role="status">
              {selectedMode === suggestion.mode
                ? `Mode pinned to ${selected.label} (matches current suggestion).`
                : `Manual override active (selected: ${selected.label}; suggested: ${suggested.label}).`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--admin-muted)]" role="status">
              Using suggested mode: {suggested.label} (confidence {suggestion.confidence}).
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:min-w-[16rem]">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Mode selector
            </legend>
            <div
              className="grid gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Owner command mode"
              data-testid="command-mode-selector"
            >
              {COMMAND_MODE_ORDER.map((modeId) => {
                const def = COMMAND_MODE_DEFINITIONS[modeId];
                const checked = selectedMode === modeId;
                const isSuggested = suggestion.mode === modeId;
                return (
                  <label
                    key={modeId}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--brand-red)] ${
                      checked
                        ? "border-[var(--brand-red)] bg-[var(--admin-soft)] text-[var(--brand-red)]"
                        : "border-[var(--admin-border)] bg-white text-[var(--admin-ink)] hover:bg-[var(--admin-soft)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="commandMode"
                      value={def.urlToken}
                      checked={checked}
                      onChange={() => onSelectMode(modeId)}
                      className="sr-only"
                    />
                    <span>
                      {def.label}
                      {isSuggested ? (
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                          Suggested
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {manualOverride ? (
            <button
              type="button"
              className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              onClick={onUseSuggested}
              data-testid="command-mode-use-suggested"
              aria-label="Use suggested command mode"
            >
              Use suggested mode
            </button>
          ) : null}
        </div>
      </div>
      {suggestion.limitations.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
          {suggestion.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
