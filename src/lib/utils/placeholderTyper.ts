export interface PlaceholderTyperOptions {
	phrases: string[];
	/** Delay before the first keystroke of a phrase. */
	typeBaseMs?: number;
	/** Minimum delay between keystrokes. */
	typeMinMs?: number;
	/** Per-character acceleration factor applied to `typeBaseMs`. */
	typeAccel?: number;
	/** Random jitter added to each keystroke delay. */
	typeJitterMs?: number;
	/** Pause after a phrase is fully typed before deleting. */
	pauseAfterTypeMs?: number;
	/** Pause after a phrase is fully deleted before the next one. */
	pauseAfterDeleteMs?: number;
	/** Delay between deletions. */
	deleteMs?: number;
}

export interface PlaceholderTyper {
	start(): void;
	stop(): void;
	onFocus(): void;
	onBlur(): void;
}

/**
 * Cycles through `phrases`, typing and deleting them character by character,
 * and reports the current text through `onUpdate`.
 *
 * Typing pauses while the input is focused and resumes on blur.
 */
export function createPlaceholderTyper(
	options: PlaceholderTyperOptions,
	onUpdate: (text: string) => void
): PlaceholderTyper {
	const {
		phrases,
		typeBaseMs = 220,
		typeMinMs = 55,
		typeAccel = 0.84,
		typeJitterMs = 18,
		pauseAfterTypeMs = 1100,
		pauseAfterDeleteMs = 400,
		deleteMs = 45
	} = options;

	let timer: ReturnType<typeof setTimeout> | null = null;
	let running = false;
	let paused = false;
	let phraseIndex = 0;
	let charIndex = 0;
	let deleting = false;

	function clearTimer() {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function schedule(ms: number) {
		clearTimer();
		timer = setTimeout(() => {
			timer = null;
			tick();
		}, ms);
	}

	function typeDelay() {
		const delay = Math.max(typeMinMs, typeBaseMs * Math.pow(typeAccel, charIndex));
		return delay + Math.random() * typeJitterMs;
	}

	function tick() {
		if (!running || paused || phrases.length === 0) return;

		const phrase = phrases[phraseIndex % phrases.length];

		if (!deleting) {
			charIndex += 1;
			onUpdate(phrase.slice(0, charIndex));
			if (charIndex >= phrase.length) {
				deleting = true;
				schedule(pauseAfterTypeMs);
			} else {
				schedule(typeDelay());
			}
			return;
		}

		charIndex -= 1;
		onUpdate(phrase.slice(0, charIndex));
		if (charIndex <= 0) {
			deleting = false;
			phraseIndex += 1;
			schedule(pauseAfterDeleteMs);
		} else {
			schedule(deleteMs);
		}
	}

	return {
		start() {
			if (running) return;
			running = true;
			schedule(typeDelay());
		},
		stop() {
			running = false;
			clearTimer();
		},
		onFocus() {
			paused = true;
			clearTimer();
		},
		onBlur() {
			paused = false;
			if (running) schedule(pauseAfterDeleteMs);
		}
	};
}
