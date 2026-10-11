import * as m from '#lib/paraglide/messages.js';

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

export function enhanceCodeBlocks(article: HTMLElement) {
	for (const pre of article.querySelectorAll('pre')) {
		if (pre.dataset.enhanced) continue;
		pre.dataset.enhanced = '1';

		const code = pre.querySelector('code');
		const lang =
			(pre.className.match(/language-(\S+)/)?.[1] ??
				code?.className.match(/language-(\S+)/)?.[1]) ||
			'';

		const wrap = document.createElement('div');
		wrap.className = 'not-prose rounded-lg border border-primary/10 overflow-hidden bg-card my-5';

		const header = document.createElement('div');
		header.className =
			'flex items-center justify-between border-b border-primary/10 bg-primary/[0.03] px-3 py-1.5';
		if (lang) {
			const chip = document.createElement('span');
			chip.className =
				'rounded border border-primary/15 bg-card px-1.5 py-0.5 text-[10px] font-medium text-primary/60';
			chip.textContent = lang;
			header.appendChild(chip);
		} else {
			header.appendChild(document.createElement('span'));
		}

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className =
			'inline-flex items-center gap-1 text-[10px] font-medium text-primary/50 hover:text-primary transition-colors';
		btn.innerHTML = `${COPY_ICON}<span>${m.ui_copy()}</span>`;
		btn.addEventListener('click', () => {
			void navigator.clipboard?.writeText(code?.innerText ?? pre.innerText);
			const label = btn.querySelector('span');
			if (!label) return;
			label.textContent = m.ui_copied();
			setTimeout(() => {
				label.textContent = m.ui_copy();
			}, 1200);
		});
		header.appendChild(btn);

		pre.className = 'overflow-x-auto p-4 m-0';
		if (code) code.className = 'font-mono text-xs leading-relaxed text-primary/80';

		pre.parentNode?.insertBefore(wrap, pre);
		wrap.appendChild(header);
		wrap.appendChild(pre);
	}
}
