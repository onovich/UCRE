import { useMemo, useState, type ChangeEvent } from "react";

import {
  CARD_TARGET_POLICIES,
  DRAFT_EFFECT_KINDS,
  compileCardEditorDrafts,
  createDraftCard,
  createDraftEffect,
  createInitialDraftCards,
  duplicateDraftCard,
  type DraftCard,
  type DraftCardEffect,
  type DraftEffectKind,
} from "./card-editor-model.js";

export function App() {
  const [cards, setCards] = useState<readonly DraftCard[]>(() => createInitialDraftCards());
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? "");
  const preview = useMemo(() => compileCardEditorDrafts(cards), [cards]);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];
  const canonicalJson = preview.result.ok
    ? preview.result.canonicalJson
    : JSON.stringify(preview.manifest, null, 2);

  function updateSelectedCard(patch: Partial<DraftCard>): void {
    if (!selectedCard) {
      return;
    }

    setCards((currentCards) =>
      currentCards.map((card) => (card.id === selectedCard.id ? { ...card, ...patch } : card)),
    );

    if (patch.id) {
      setSelectedCardId(patch.id);
    }
  }

  function updateSelectedEffect(index: number, patch: Partial<DraftCardEffect>): void {
    if (!selectedCard) {
      return;
    }

    updateSelectedCard({
      effects: selectedCard.effects.map((effect, effectIndex) =>
        effectIndex === index ? { ...effect, ...patch } : effect,
      ),
    });
  }

  function addCard(): void {
    const card = createDraftCard(cards.length + 1);
    setCards((currentCards) => [...currentCards, card]);
    setSelectedCardId(card.id);
  }

  function duplicateSelectedCard(): void {
    if (!selectedCard) {
      return;
    }

    const card = duplicateDraftCard(selectedCard, cards.length + 1);
    setCards((currentCards) => [...currentCards, card]);
    setSelectedCardId(card.id);
  }

  function addEffect(): void {
    if (!selectedCard) {
      return;
    }

    updateSelectedCard({
      effects: [...selectedCard.effects, createDraftEffect(selectedCard.effects.length + 1)],
    });
  }

  function removeEffect(index: number): void {
    if (!selectedCard || selectedCard.effects.length <= 1) {
      return;
    }

    updateSelectedCard({
      effects: selectedCard.effects.filter((_, effectIndex) => effectIndex !== index),
    });
  }

  return (
    <main className="editor-shell" aria-label="UCRE Editor">
      <header className="editor-header">
        <div>
          <span className="eyebrow">UCRE</span>
          <h1>Content Editor</h1>
        </div>
        <div className="status-cluster" aria-label="Compile status">
          <span
            className={preview.result.ok ? "status-pill status-ok" : "status-pill status-error"}
          >
            {preview.result.ok ? "Compiled" : "Blocked"}
          </span>
          <span className="status-pill">{cards.length} cards</span>
          <span className="status-pill">
            {preview.result.ok
              ? preview.result.manifestHash
              : `${preview.result.errors.length} errors`}
          </span>
        </div>
      </header>

      <section className="editor-layout" aria-label="Card editor workspace">
        <aside className="editor-panel card-list-panel" aria-label="Cards">
          <div className="panel-heading">
            <h2>Cards</h2>
            <button className="primary-button compact-button" type="button" onClick={addCard}>
              New
            </button>
          </div>
          <div className="card-list">
            {cards.map((card) => (
              <button
                className={card.id === selectedCard?.id ? "card-row card-row-selected" : "card-row"}
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
              >
                <strong>{card.name || "(unnamed)"}</strong>
                <span>{card.id || "(missing id)"}</span>
                <span>
                  {card.costText || "-"} cost · {card.targetPolicy}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel card-form-panel" aria-label="Card details">
          <div className="panel-heading">
            <h2>Card</h2>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={duplicateSelectedCard}
              disabled={!selectedCard}
            >
              Duplicate
            </button>
          </div>

          {selectedCard ? (
            <div className="editor-form">
              <label>
                <span>ID</span>
                <input
                  value={selectedCard.id}
                  onChange={(event) => updateSelectedCard({ id: event.target.value })}
                />
              </label>
              <label>
                <span>Name</span>
                <input
                  value={selectedCard.name}
                  onChange={(event) => updateSelectedCard({ name: event.target.value })}
                />
              </label>
              <label>
                <span>Cost</span>
                <input
                  inputMode="numeric"
                  value={selectedCard.costText}
                  onChange={(event) => updateSelectedCard({ costText: event.target.value })}
                />
              </label>
              <label>
                <span>Target</span>
                <select
                  value={selectedCard.targetPolicy}
                  onChange={(event) =>
                    updateSelectedCard({
                      targetPolicy: event.target.value as DraftCard["targetPolicy"],
                    })
                  }
                >
                  {CARD_TARGET_POLICIES.map((policy) => (
                    <option key={policy} value={policy}>
                      {policy}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide-field">
                <span>Tags</span>
                <input
                  value={selectedCard.tagsText}
                  onChange={(event) => updateSelectedCard({ tagsText: event.target.value })}
                />
              </label>

              <section className="effect-editor" aria-label="Effects">
                <div className="panel-heading">
                  <h3>Effects</h3>
                  <button className="ghost-button compact-button" type="button" onClick={addEffect}>
                    Add
                  </button>
                </div>
                <div className="effect-list">
                  {selectedCard.effects.map((effect, index) => (
                    <EffectRow
                      effect={effect}
                      index={index}
                      key={`${effect.id}-${index}`}
                      canRemove={selectedCard.effects.length > 1}
                      onChange={(patch) => updateSelectedEffect(index, patch)}
                      onRemove={() => removeEffect(index)}
                    />
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </section>

        <aside className="editor-panel validation-panel" aria-label="Validation">
          <div className="panel-heading">
            <h2>Manifest</h2>
            <span className={preview.result.ok ? "preview-ok" : "preview-blocked"}>
              {preview.result.ok ? "OK" : "Errors"}
            </span>
          </div>

          {preview.result.ok ? (
            <dl className="manifest-summary">
              <div>
                <dt>Hash</dt>
                <dd>{preview.result.manifestHash}</dd>
              </div>
              <div>
                <dt>Cards</dt>
                <dd>{preview.result.manifest.cards.length}</dd>
              </div>
              <div>
                <dt>Profiles</dt>
                <dd>{preview.result.manifest.presentationProfiles.length}</dd>
              </div>
            </dl>
          ) : (
            <ul className="error-list">
              {preview.result.errors.map((error) => (
                <li key={`${error.code}-${error.path}-${error.message}`}>
                  <strong>{error.code}</strong>
                  <span>{error.path || "(root)"}</span>
                  <p>{error.message}</p>
                </li>
              ))}
            </ul>
          )}

          <textarea readOnly value={canonicalJson} aria-label="Canonical manifest preview" />
        </aside>
      </section>
    </main>
  );
}

function EffectRow(props: {
  readonly effect: DraftCardEffect;
  readonly index: number;
  readonly canRemove: boolean;
  readonly onChange: (patch: Partial<DraftCardEffect>) => void;
  readonly onRemove: () => void;
}) {
  return (
    <div className="effect-row">
      <label>
        <span>ID</span>
        <input
          value={props.effect.id}
          onChange={(event) => props.onChange({ id: event.target.value })}
        />
      </label>
      <label>
        <span>Type</span>
        <select
          value={props.effect.type}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            props.onChange({ type: event.target.value as DraftEffectKind })
          }
        >
          {DRAFT_EFFECT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Amount</span>
        <input
          inputMode="numeric"
          value={props.effect.amountText}
          onChange={(event) => props.onChange({ amountText: event.target.value })}
        />
      </label>
      <button
        className="ghost-button compact-button"
        type="button"
        onClick={props.onRemove}
        disabled={!props.canRemove}
        aria-label={`Remove effect ${props.index + 1}`}
      >
        Remove
      </button>
    </div>
  );
}
