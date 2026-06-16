import { useMemo, useState, type ChangeEvent } from "react";

import {
  CARD_TARGET_POLICIES,
  DRAFT_EFFECT_KINDS,
  EDITOR_ENTITY_KINDS,
  compileEditorContent,
  createDraftCard,
  createDraftEffect,
  createDraftEnemy,
  createDraftRelic,
  createDraftRewardPool,
  createInitialDraftContent,
  duplicateDraftCard,
  duplicateDraftEnemy,
  duplicateDraftRelic,
  duplicateDraftRewardPool,
  type DraftCard,
  type DraftCardEffect,
  type DraftEffectKind,
  type DraftEditorContent,
  type DraftEnemy,
  type DraftRelic,
  type DraftRewardChoice,
  type DraftRewardPool,
  type EditorEntityKind,
} from "./card-editor-model.js";

type SelectionState = Record<EditorEntityKind, string>;

const ENTITY_LABELS: Record<EditorEntityKind, string> = {
  cards: "Cards",
  relics: "Relics",
  enemies: "Enemies",
  rewardPools: "Rewards",
};

export function App() {
  const [content, setContent] = useState<DraftEditorContent>(() => createInitialDraftContent());
  const [activeKind, setActiveKind] = useState<EditorEntityKind>("cards");
  const [selection, setSelection] = useState<SelectionState>(() => ({
    cards: content.cards[0]?.id ?? "",
    relics: content.relics[0]?.id ?? "",
    enemies: content.enemies[0]?.id ?? "",
    rewardPools: content.rewardPools[0]?.id ?? "",
  }));
  const preview = useMemo(() => compileEditorContent(content), [content]);
  const selectedCard =
    content.cards.find((card) => card.id === selection.cards) ?? content.cards[0];
  const selectedRelic =
    content.relics.find((relic) => relic.id === selection.relics) ?? content.relics[0];
  const selectedEnemy =
    content.enemies.find((enemy) => enemy.id === selection.enemies) ?? content.enemies[0];
  const selectedRewardPool =
    content.rewardPools.find((rewardPool) => rewardPool.id === selection.rewardPools) ??
    content.rewardPools[0];
  const activeItems = getActiveItems(content, activeKind);
  const canonicalJson = preview.result.ok
    ? preview.result.canonicalJson
    : JSON.stringify(preview.manifest, null, 2);

  function setSelectedId(kind: EditorEntityKind, id: string): void {
    setSelection((currentSelection) => ({
      ...currentSelection,
      [kind]: id,
    }));
  }

  function updateSelectedCard(patch: Partial<DraftCard>): void {
    if (!selectedCard) {
      return;
    }

    setContent((currentContent) => ({
      ...currentContent,
      cards: currentContent.cards.map((card) =>
        card.id === selectedCard.id ? { ...card, ...patch } : card,
      ),
    }));

    if (patch.id) {
      setSelectedId("cards", patch.id);
    }
  }

  function updateSelectedRelic(patch: Partial<DraftRelic>): void {
    if (!selectedRelic) {
      return;
    }

    setContent((currentContent) => ({
      ...currentContent,
      relics: currentContent.relics.map((relic) =>
        relic.id === selectedRelic.id ? { ...relic, ...patch } : relic,
      ),
    }));

    if (patch.id) {
      setSelectedId("relics", patch.id);
    }
  }

  function updateSelectedEnemy(patch: Partial<DraftEnemy>): void {
    if (!selectedEnemy) {
      return;
    }

    setContent((currentContent) => ({
      ...currentContent,
      enemies: currentContent.enemies.map((enemy) =>
        enemy.id === selectedEnemy.id ? { ...enemy, ...patch } : enemy,
      ),
    }));

    if (patch.id) {
      setSelectedId("enemies", patch.id);
    }
  }

  function updateSelectedRewardPool(patch: Partial<DraftRewardPool>): void {
    if (!selectedRewardPool) {
      return;
    }

    setContent((currentContent) => ({
      ...currentContent,
      rewardPools: currentContent.rewardPools.map((rewardPool) =>
        rewardPool.id === selectedRewardPool.id ? { ...rewardPool, ...patch } : rewardPool,
      ),
    }));

    if (patch.id) {
      setSelectedId("rewardPools", patch.id);
    }
  }

  function addActiveEntity(): void {
    if (activeKind === "cards") {
      const card = createDraftCard(content.cards.length + 1);
      setContent((currentContent) => ({
        ...currentContent,
        cards: [...currentContent.cards, card],
      }));
      setSelectedId("cards", card.id);
      return;
    }

    if (activeKind === "relics") {
      const relic = createDraftRelic(content.relics.length + 1);
      setContent((currentContent) => ({
        ...currentContent,
        relics: [...currentContent.relics, relic],
      }));
      setSelectedId("relics", relic.id);
      return;
    }

    if (activeKind === "rewardPools") {
      const rewardPool = createDraftRewardPool(
        content.rewardPools.length + 1,
        content.cards[0]?.id,
      );
      setContent((currentContent) => ({
        ...currentContent,
        rewardPools: [...currentContent.rewardPools, rewardPool],
      }));
      setSelectedId("rewardPools", rewardPool.id);
      return;
    }

    const enemy = createDraftEnemy(content.enemies.length + 1);
    setContent((currentContent) => ({
      ...currentContent,
      enemies: [...currentContent.enemies, enemy],
    }));
    setSelectedId("enemies", enemy.id);
  }

  function duplicateActiveEntity(): void {
    if (activeKind === "cards" && selectedCard) {
      const card = duplicateDraftCard(selectedCard, content.cards.length + 1);
      setContent((currentContent) => ({
        ...currentContent,
        cards: [...currentContent.cards, card],
      }));
      setSelectedId("cards", card.id);
      return;
    }

    if (activeKind === "relics" && selectedRelic) {
      const relic = duplicateDraftRelic(selectedRelic, content.relics.length + 1);
      setContent((currentContent) => ({
        ...currentContent,
        relics: [...currentContent.relics, relic],
      }));
      setSelectedId("relics", relic.id);
      return;
    }

    if (activeKind === "enemies" && selectedEnemy) {
      const enemy = duplicateDraftEnemy(selectedEnemy, content.enemies.length + 1);
      setContent((currentContent) => ({
        ...currentContent,
        enemies: [...currentContent.enemies, enemy],
      }));
      setSelectedId("enemies", enemy.id);
      return;
    }

    if (activeKind === "rewardPools" && selectedRewardPool) {
      const rewardPool = duplicateDraftRewardPool(
        selectedRewardPool,
        content.rewardPools.length + 1,
      );
      setContent((currentContent) => ({
        ...currentContent,
        rewardPools: [...currentContent.rewardPools, rewardPool],
      }));
      setSelectedId("rewardPools", rewardPool.id);
    }
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
          <span className="status-pill">
            {content.cards.length} cards / {content.relics.length} relics / {content.enemies.length}{" "}
            enemies / {content.rewardPools.length} rewards
          </span>
          <span className="status-pill">
            {preview.result.ok
              ? preview.result.manifestHash
              : `${preview.result.errors.length} errors`}
          </span>
        </div>
      </header>

      <nav className="entity-tabs" aria-label="Content type">
        {EDITOR_ENTITY_KINDS.map((kind) => (
          <button
            className={kind === activeKind ? "entity-tab entity-tab-active" : "entity-tab"}
            key={kind}
            type="button"
            onClick={() => setActiveKind(kind)}
          >
            {ENTITY_LABELS[kind]}
          </button>
        ))}
      </nav>

      <section className="editor-layout" aria-label="Editor workspace">
        <aside className="editor-panel card-list-panel" aria-label={ENTITY_LABELS[activeKind]}>
          <div className="panel-heading">
            <h2>{ENTITY_LABELS[activeKind]}</h2>
            <button
              className="primary-button compact-button"
              type="button"
              onClick={addActiveEntity}
            >
              New
            </button>
          </div>
          <div className="card-list">
            {activeItems.map((item) => (
              <button
                className={
                  item.id === selection[activeKind] ? "card-row card-row-selected" : "card-row"
                }
                key={item.id}
                type="button"
                onClick={() => setSelectedId(activeKind, item.id)}
              >
                <strong>{getEntityName(activeKind, item) || "(unnamed)"}</strong>
                <span>{item.id || "(missing id)"}</span>
                <span>{getEntityMeta(activeKind, item)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel card-form-panel" aria-label="Details">
          <div className="panel-heading">
            <h2>{singularLabel(activeKind)}</h2>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={duplicateActiveEntity}
              disabled={activeItems.length === 0}
            >
              Duplicate
            </button>
          </div>

          {activeKind === "cards" && selectedCard ? (
            <CardForm card={selectedCard} onChange={updateSelectedCard} />
          ) : null}
          {activeKind === "relics" && selectedRelic ? (
            <RelicForm relic={selectedRelic} onChange={updateSelectedRelic} />
          ) : null}
          {activeKind === "enemies" && selectedEnemy ? (
            <EnemyForm enemy={selectedEnemy} onChange={updateSelectedEnemy} />
          ) : null}
          {activeKind === "rewardPools" && selectedRewardPool ? (
            <RewardPoolForm
              rewardPool={selectedRewardPool}
              cards={content.cards}
              onChange={updateSelectedRewardPool}
            />
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
                <dt>Relics</dt>
                <dd>{preview.result.manifest.relics.length}</dd>
              </div>
              <div>
                <dt>Enemies</dt>
                <dd>{preview.result.manifest.enemies.length}</dd>
              </div>
              <div>
                <dt>Rewards</dt>
                <dd>{preview.result.manifest.rewardPools.length}</dd>
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

function CardForm(props: {
  readonly card: DraftCard;
  readonly onChange: (patch: Partial<DraftCard>) => void;
}) {
  return (
    <div className="editor-form">
      <label>
        <span>ID</span>
        <input
          value={props.card.id}
          onChange={(event) => props.onChange({ id: event.target.value })}
        />
      </label>
      <label>
        <span>Name</span>
        <input
          value={props.card.name}
          onChange={(event) => props.onChange({ name: event.target.value })}
        />
      </label>
      <label>
        <span>Cost</span>
        <input
          inputMode="numeric"
          value={props.card.costText}
          onChange={(event) => props.onChange({ costText: event.target.value })}
        />
      </label>
      <label>
        <span>Target</span>
        <select
          value={props.card.targetPolicy}
          onChange={(event) =>
            props.onChange({
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
          value={props.card.tagsText}
          onChange={(event) => props.onChange({ tagsText: event.target.value })}
        />
      </label>
      <EffectEditor
        label="Effects"
        effects={props.card.effects}
        onChange={(effects) => props.onChange({ effects })}
      />
    </div>
  );
}

function RelicForm(props: {
  readonly relic: DraftRelic;
  readonly onChange: (patch: Partial<DraftRelic>) => void;
}) {
  return (
    <div className="editor-form">
      <label>
        <span>ID</span>
        <input
          value={props.relic.id}
          onChange={(event) => props.onChange({ id: event.target.value })}
        />
      </label>
      <label>
        <span>Name</span>
        <input
          value={props.relic.name}
          onChange={(event) => props.onChange({ name: event.target.value })}
        />
      </label>
      <label className="wide-field">
        <span>Description</span>
        <input
          value={props.relic.description}
          onChange={(event) => props.onChange({ description: event.target.value })}
        />
      </label>
      <label className="wide-field">
        <span>Tags</span>
        <input
          value={props.relic.tagsText}
          onChange={(event) => props.onChange({ tagsText: event.target.value })}
        />
      </label>
      <EffectEditor
        label="Effects"
        effects={props.relic.effects}
        onChange={(effects) => props.onChange({ effects })}
      />
    </div>
  );
}

function EnemyForm(props: {
  readonly enemy: DraftEnemy;
  readonly onChange: (patch: Partial<DraftEnemy>) => void;
}) {
  return (
    <div className="editor-form">
      <label>
        <span>ID</span>
        <input
          value={props.enemy.id}
          onChange={(event) => props.onChange({ id: event.target.value })}
        />
      </label>
      <label>
        <span>Name</span>
        <input
          value={props.enemy.name}
          onChange={(event) => props.onChange({ name: event.target.value })}
        />
      </label>
      <label>
        <span>HP</span>
        <input
          inputMode="numeric"
          value={props.enemy.hpText}
          onChange={(event) => props.onChange({ hpText: event.target.value })}
        />
      </label>
      <label>
        <span>Block</span>
        <input
          inputMode="numeric"
          value={props.enemy.blockText}
          onChange={(event) => props.onChange({ blockText: event.target.value })}
        />
      </label>
      <label className="wide-field">
        <span>Tags</span>
        <input
          value={props.enemy.tagsText}
          onChange={(event) => props.onChange({ tagsText: event.target.value })}
        />
      </label>
      <EffectEditor
        label="Intents"
        effects={props.enemy.intents}
        onChange={(intents) => props.onChange({ intents })}
      />
    </div>
  );
}

function RewardPoolForm(props: {
  readonly rewardPool: DraftRewardPool;
  readonly cards: readonly DraftCard[];
  readonly onChange: (patch: Partial<DraftRewardPool>) => void;
}) {
  return (
    <div className="editor-form">
      <label className="wide-field">
        <span>ID</span>
        <input
          value={props.rewardPool.id}
          onChange={(event) => props.onChange({ id: event.target.value })}
        />
      </label>
      <RewardChoiceEditor
        choices={props.rewardPool.choices}
        cardIds={props.cards.map((card) => card.id)}
        onChange={(choices) => props.onChange({ choices })}
      />
    </div>
  );
}

function RewardChoiceEditor(props: {
  readonly choices: readonly DraftRewardChoice[];
  readonly cardIds: readonly string[];
  readonly onChange: (choices: readonly DraftRewardChoice[]) => void;
}) {
  function updateChoice(index: number, patch: Partial<DraftRewardChoice>): void {
    props.onChange(
      props.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...patch } : choice,
      ),
    );
  }

  function addChoice(): void {
    props.onChange([
      ...props.choices,
      {
        cardId: props.cardIds[0] ?? "",
        weightText: "1",
      },
    ]);
  }

  function removeChoice(index: number): void {
    if (props.choices.length <= 1) {
      return;
    }

    props.onChange(props.choices.filter((_, choiceIndex) => choiceIndex !== index));
  }

  return (
    <section className="effect-editor" aria-label="Choices">
      <div className="panel-heading">
        <h3>Choices</h3>
        <button className="ghost-button compact-button" type="button" onClick={addChoice}>
          Add
        </button>
      </div>
      <datalist id="reward-card-ids">
        {props.cardIds.map((cardId) => (
          <option key={cardId} value={cardId} />
        ))}
      </datalist>
      <div className="effect-list">
        {props.choices.map((choice, index) => (
          <div className="choice-row" key={`${choice.cardId}-${index}`}>
            <label>
              <span>Card ID</span>
              <input
                list="reward-card-ids"
                value={choice.cardId}
                onChange={(event) => updateChoice(index, { cardId: event.target.value })}
              />
            </label>
            <label>
              <span>Weight</span>
              <input
                inputMode="numeric"
                value={choice.weightText}
                onChange={(event) => updateChoice(index, { weightText: event.target.value })}
              />
            </label>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => removeChoice(index)}
              disabled={props.choices.length <= 1}
              aria-label={`Remove reward choice ${index + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EffectEditor(props: {
  readonly label: string;
  readonly effects: readonly DraftCardEffect[];
  readonly onChange: (effects: readonly DraftCardEffect[]) => void;
}) {
  function updateEffect(index: number, patch: Partial<DraftCardEffect>): void {
    props.onChange(
      props.effects.map((effect, effectIndex) =>
        effectIndex === index ? { ...effect, ...patch } : effect,
      ),
    );
  }

  function addEffect(): void {
    props.onChange([...props.effects, createDraftEffect(props.effects.length + 1)]);
  }

  function removeEffect(index: number): void {
    if (props.effects.length <= 1) {
      return;
    }

    props.onChange(props.effects.filter((_, effectIndex) => effectIndex !== index));
  }

  return (
    <section className="effect-editor" aria-label={props.label}>
      <div className="panel-heading">
        <h3>{props.label}</h3>
        <button className="ghost-button compact-button" type="button" onClick={addEffect}>
          Add
        </button>
      </div>
      <div className="effect-list">
        {props.effects.map((effect, index) => (
          <EffectRow
            effect={effect}
            index={index}
            key={`${effect.id}-${index}`}
            canRemove={props.effects.length > 1}
            onChange={(patch) => updateEffect(index, patch)}
            onRemove={() => removeEffect(index)}
          />
        ))}
      </div>
    </section>
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

function getActiveItems(content: DraftEditorContent, kind: EditorEntityKind) {
  if (kind === "cards") {
    return content.cards;
  }

  if (kind === "relics") {
    return content.relics;
  }

  if (kind === "enemies") {
    return content.enemies;
  }

  return content.rewardPools;
}

function getEntityMeta(
  kind: EditorEntityKind,
  item: DraftCard | DraftRelic | DraftEnemy | DraftRewardPool,
): string {
  if (kind === "cards") {
    const card = item as DraftCard;
    return `${card.costText || "-"} cost - ${card.targetPolicy}`;
  }

  if (kind === "relics") {
    const relic = item as DraftRelic;
    return `${relic.effects.length} effects`;
  }

  if (kind === "rewardPools") {
    const rewardPool = item as DraftRewardPool;
    return `${rewardPool.choices.length} choices`;
  }

  const enemy = item as DraftEnemy;
  return `${enemy.hpText || "-"} HP - ${enemy.intents.length} intents`;
}

function getEntityName(
  kind: EditorEntityKind,
  item: DraftCard | DraftRelic | DraftEnemy | DraftRewardPool,
): string {
  if (kind === "rewardPools") {
    return (item as DraftRewardPool).id;
  }

  return (item as DraftCard | DraftRelic | DraftEnemy).name;
}

function singularLabel(kind: EditorEntityKind): string {
  if (kind === "cards") {
    return "Card";
  }

  if (kind === "relics") {
    return "Relic";
  }

  if (kind === "rewardPools") {
    return "Reward Pool";
  }

  return "Enemy";
}
