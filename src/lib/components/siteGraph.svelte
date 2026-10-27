<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { ENTITY_COLOR, entityLabel } from '#lib/meta.js';
	import type { Entity } from '#lib/entities.js';
	import type { GraphNode, GraphEdge } from '#lib/data.js';
	import * as m from '#lib/paraglide/messages.js';

	let {
		nodes,
		edges,
		hrefFor,
		focusId
	}: {
		nodes: GraphNode[];
		edges: GraphEdge[];
		hrefFor: (node: GraphNode) => string;
		focusId?: string;
	} = $props();

	type Sim = { x: number; y: number; vx: number; vy: number };

	function buildGraph() {
		const n = nodes.length;
		const spread = 55 * Math.sqrt(Math.max(n, 1));
		const deg = new Array<number>(n).fill(0);
		const adj = nodes.map<Set<number>>(() => new Set());
		for (const e of edges) {
			deg[e.a]++;
			deg[e.b]++;
			adj[e.a].add(e.b);
			adj[e.b].add(e.a);
		}
		const sim: Sim[] = nodes.map((_, i) => {
			const a = i * 2.399963; // golden-angle phyllotaxis start
			const r = spread * 0.9 * Math.sqrt((i + 0.5) / Math.max(n, 1));
			return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 };
		});
		return { n, spread, deg, adj, sim };
	}

	let n = 0;
	let spread = 0;
	let deg: number[] = [];
	let adj: Set<number>[] = [];
	let sim: Sim[] = [];
	let focusIdx = -1;
	let focusDone = true;

	const nodeColor = (i: number) =>
		ENTITY_COLOR[nodes[i].entity as Entity] ?? ENTITY_COLOR.lagstiftning;
	const rOf = (i: number) => 3 + Math.min(deg[i], 10) * 0.7; // css px

	const entities = $derived([...new Set(nodes.map((nd) => nd.entity))].sort());

	let alpha = 1;
	let raf = 0;
	let dragging = -1;
	let simStarted = false;

	function startSim() {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			for (let i = 0; i < 400 && alpha > 0.003; i++) step();
			draw();
			applyFocus();
		} else {
			raf = requestAnimationFrame(frame);
		}
	}

	// Spatial-grid repulsion: nodes only repel neighbours within CUT units,
	// so the O(n²) all-pairs loop becomes ~O(n) per step.
	const CUT = 150;
	const CUT2 = CUT * CUT;
	const gkey = (x: number, y: number) =>
		(Math.floor(x / CUT) + 4096) * 8192 + Math.floor(y / CUT) + 4096;

	function step() {
		const grid: Record<number, number[]> = {};
		for (let i = 0; i < n; i++) {
			const s = sim[i];
			const k = gkey(s.x, s.y);
			(grid[k] ??= []).push(i);
		}
		for (let i = 0; i < n; i++) {
			const s = sim[i];
			s.vx -= s.x * 0.004 * alpha;
			s.vy -= s.y * 0.004 * alpha;
			const gx = Math.floor(s.x / CUT);
			const gy = Math.floor(s.y / CUT);
			for (let ox = -1; ox <= 1; ox++) {
				for (let oy = -1; oy <= 1; oy++) {
					const cell = grid[(gx + ox + 4096) * 8192 + gy + oy + 4096];
					if (!cell) continue;
					for (const j of cell) {
						if (j <= i) continue;
						const o = sim[j];
						const dx = s.x - o.x;
						const dy = s.y - o.y;
						const d2 = dx * dx + dy * dy + 1;
						if (d2 > CUT2) continue;
						const f = (2600 * alpha) / d2;
						const d = Math.sqrt(d2);
						s.vx += (dx / d) * f;
						s.vy += (dy / d) * f;
						o.vx -= (dx / d) * f;
						o.vy -= (dy / d) * f;
					}
				}
			}
		}
		for (const e of edges) {
			const a = sim[e.a];
			const b = sim[e.b];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const d = Math.sqrt(dx * dx + dy * dy) || 1;
			const f = (d - 70) * 0.012 * alpha;
			a.vx += (dx / d) * f;
			a.vy += (dy / d) * f;
			b.vx -= (dx / d) * f;
			b.vy -= (dy / d) * f;
		}
		for (const s of sim) {
			s.vx *= 0.86;
			s.vy *= 0.86;
			const v2 = s.vx * s.vx + s.vy * s.vy;
			if (v2 > 144) {
				const c = 12 / Math.sqrt(v2);
				s.vx *= c;
				s.vy *= c;
			}
			s.x += s.vx;
			s.y += s.vy;
		}
		alpha *= 0.985;
	}

	function frame() {
		step();
		if (alpha > 0.35) step(); // extra step while hot so it settles faster
		draw();
		if (alpha > 0.003) raf = requestAnimationFrame(frame);
		else {
			raf = 0;
			applyFocus();
		}
	}

	// ?fokus=<id>: once the layout settles, centre on the node and show
	// its label/neighbours as if hovered.
	function applyFocus() {
		if (focusDone || focusIdx < 0) return;
		focusDone = true;
		cx = sim[focusIdx].x;
		cy = sim[focusIdx].y;
		vw = Math.min(vw || spread * 2, Math.max(spread * 0.5, 60));
		hover = focusIdx;
		draw();
	}

	function reheat() {
		alpha = Math.max(alpha, 0.2);
		if (!raf) raf = requestAnimationFrame(frame);
	}

	// View transform: (cx, cy) = world centre, vw = world units across width.
	let wrapEl = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let ctx: CanvasRenderingContext2D | null = null;
	let w = $state(0);
	let h = $state(0);
	let cx = $state(0);
	let cy = $state(0);
	let vw = $state(0);
	const px = $derived(vw / Math.max(w, 1)); // world units per css px
	const k = $derived(Math.max(w, 1) / vw); // css px per world unit

	let hover = $state(-1);
	const lit = $derived(hover >= 0 && adj[hover] ? new Set([hover, ...adj[hover]]) : null);

	function draw() {
		if (!ctx || !w || !h || !vw) return;
		const c = ctx;
		const dpr = devicePixelRatio || 1;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, w, h);
		c.translate(w / 2, h / 2);
		c.scale(k, k);
		c.translate(-cx, -cy);

		const dim = lit !== null;
		// edges
		for (const e of edges) {
			const a = sim[e.a];
			const b = sim[e.b];
			const on = !dim || lit.has(e.a) || lit.has(e.b);
			c.strokeStyle = on
				? e.kind === 'rel'
					? 'rgba(68, 52, 36, 0.55)'
					: e.kind === 'issuer'
						? 'rgba(68, 52, 36, 0.35)'
						: 'rgba(68, 52, 36, 0.2)'
				: 'rgba(68, 52, 36, 0.05)';
			c.lineWidth = (e.kind === 'rel' ? 1.4 : 1) * px;
			c.setLineDash(e.kind === 'rel' ? [4 * px, 3 * px] : []);
			c.beginPath();
			c.moveTo(a.x, a.y);
			c.lineTo(b.x, b.y);
			c.stroke();
		}
		c.setLineDash([]);
		// nodes
		for (let i = 0; i < n; i++) {
			const s = sim[i];
			const on = !dim || lit.has(i);
			c.globalAlpha = on ? 0.9 : 0.15;
			c.fillStyle = nodeColor(i);
			c.beginPath();
			c.arc(s.x, s.y, rOf(i) * px, 0, Math.PI * 2);
			c.fill();
		}
		c.globalAlpha = 1;

		// Labels: only on hover. The hovered node is always labelled; its
		// neighbours are labelled when they pass a zoom-dependent degree
		// threshold — zoomed out shows only big neighbours, zoomed in more.
		if (lit !== null) {
			c.fillStyle = 'rgba(41, 32, 24, 0.9)';
			c.font = `${12 * px}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
			c.textBaseline = 'middle';
			const x0 = cx - vw / 2 - 120 * px;
			const x1 = cx + vw / 2 + 120 * px;
			const label = (i: number) => {
				const s = sim[i];
				if (s.x < x0 || s.x > x1) return;
				c.fillText(nodes[i].title, s.x + rOf(i) * px + 4 * px, s.y);
			};
			label(hover);
			const minDeg = Math.max(1, Math.ceil(px * 4));
			[...lit]
				.filter((i) => i !== hover && deg[i] >= minDeg)
				.sort((a, b) => deg[b] - deg[a])
				.slice(0, 20)
				.forEach(label);
		}
	}

	// Hit-test: nearest node within its hit radius (world coords).
	function nodeAt(wx: number, wy: number): number {
		let best = -1;
		let bestD = Infinity;
		for (let i = 0; i < n; i++) {
			const s = sim[i];
			const hr = Math.max(rOf(i) + 6, 12) * px;
			const d2 = (s.x - wx) ** 2 + (s.y - wy) ** 2;
			if (d2 < hr * hr && d2 < bestD) {
				bestD = d2;
				best = i;
			}
		}
		return best;
	}

	const toWorld = (e: PointerEvent) => {
		const rect = canvas!.getBoundingClientRect();
		return {
			x: cx - vw / 2 + ((e.clientX - rect.left) / rect.width) * vw,
			y: cy - vh / 2 + ((e.clientY - rect.top) / rect.height) * vh
		};
	};
	const vh = $derived(vw * (h / Math.max(w, 1)));

	let mode: 'idle' | 'pan' | 'node' = 'idle';
	let pStart = { x: 0, y: 0 };
	let cStart = { x: 0, y: 0 };
	let moved = 0;
	let panning = $state(false);

	function onPointerDown(e: PointerEvent) {
		if (!canvas) return;
		const p = toWorld(e);
		const hit = nodeAt(p.x, p.y);
		pStart = { x: e.clientX, y: e.clientY };
		moved = 0;
		if (hit >= 0) {
			mode = 'node';
			dragging = hit;
		} else {
			mode = 'pan';
			panning = true;
			cStart = { x: cx, y: cy };
		}
		canvas.setPointerCapture(e.pointerId);
	}

	function onMove(e: PointerEvent) {
		if (mode === 'idle') {
			// hover tracking — cheap linear scan
			if (!canvas || !vw) return;
			const p = toWorld(e);
			const hit = nodeAt(p.x, p.y);
			if (hit !== hover) {
				hover = hit;
				draw();
			}
			return;
		}
		const dx = e.clientX - pStart.x;
		const dy = e.clientY - pStart.y;
		moved = Math.max(moved, Math.hypot(dx, dy));
		if (mode === 'pan') {
			cx = cStart.x - dx * px;
			cy = cStart.y - dy * px;
			draw();
		} else if (mode === 'node' && dragging >= 0 && canvas) {
			const p = toWorld(e);
			sim[dragging].x = p.x;
			sim[dragging].y = p.y;
			sim[dragging].vx = sim[dragging].vy = 0;
			hover = dragging;
			reheat();
		}
	}

	function onUp(e: PointerEvent) {
		const wasNode = mode === 'node';
		mode = 'idle';
		panning = false;
		if (wasNode && dragging >= 0 && moved <= 4) {
			// treat as click → navigate; hrefFor() already returns resolved URLs
			const href = hrefFor(nodes[dragging]);
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			if (href.startsWith('/')) goto(href);
			else window.location.href = href;
		}
		dragging = -1;
		draw();
		if (!canvas) return;
		if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
	}

	function onLeave() {
		if (hover !== -1) {
			hover = -1;
			draw();
		}
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		if (!canvas || !vw) return;
		const rect = canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) / rect.width;
		const my = (e.clientY - rect.top) / rect.height;
		const wx = cx - vw / 2 + mx * vw;
		const wy = cy - vh / 2 + my * vh;
		const nvw = Math.min(Math.max(vw * Math.exp(e.deltaY * 0.0012), spread * 0.3), spread * 6);
		const nvh = nvw * (h / Math.max(w, 1));
		vw = nvw;
		cx = wx - (mx - 0.5) * nvw;
		cy = wy - (my - 0.5) * nvh;
		draw();
	}

	function resize() {
		if (!wrapEl || !canvas) return;
		w = wrapEl.clientWidth;
		h = wrapEl.clientHeight;
		const dpr = devicePixelRatio || 1;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		if (!vw) vw = spread * 2.0;
		draw();
	}

	onMount(() => {
		if (!wrapEl || !canvas) return;
		ctx = canvas.getContext('2d');
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(wrapEl);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		canvas.addEventListener('pointerleave', onLeave);
		simStarted = true;
		startSim();
		return () => {
			ro.disconnect();
			canvas?.removeEventListener('wheel', onWheel);
			canvas?.removeEventListener('pointerdown', onPointerDown);
			canvas?.removeEventListener('pointerleave', onLeave);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (raf) cancelAnimationFrame(raf);
		};
	});

	// Rebuild the simulation when the input data changes (e.g. entity
	// filters on the graph page) and restart the layout.
	$effect(() => {
		const g = buildGraph();
		n = g.n;
		spread = g.spread;
		deg = g.deg;
		adj = g.adj;
		sim = g.sim;
		hover = -1;
		dragging = -1;
		focusIdx = focusId ? nodes.findIndex((nd) => nd.id === focusId) : -1;
		focusDone = focusIdx < 0;
		alpha = 1;
		vw = 0;
		cx = 0;
		cy = 0;
		untrack(() => {
			if (!simStarted) return;
			if (raf) cancelAnimationFrame(raf);
			resize();
			startSim();
		});
	});

	const title = $derived(hover >= 0 ? nodes[hover].title : '');
</script>

<div
	bind:this={wrapEl}
	class="relative h-[68svh] min-h-105 touch-none overflow-hidden rounded-lg border border-primary/10 bg-white/40"
>
	<canvas
		bind:this={canvas}
		class="block {panning ? 'cursor-grabbing' : hover >= 0 ? 'cursor-pointer' : 'cursor-grab'}"
		{title}
		aria-label={m.ui_relationship_graph()}
	></canvas>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<ul class="sr-only">
		{#each nodes as nd (nd.entity + nd.id)}
			<li><a href={hrefFor(nd)}>{nd.title}</a></li>
		{/each}
	</ul>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{#if entities.length}
		<div
			class="pointer-events-none absolute bottom-2 left-2 flex max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-md bg-background/80 px-2 py-1 backdrop-blur-sm"
		>
			{#each entities as ent (ent)}
				<span class="flex items-center gap-1 text-[10px] text-primary/70">
					<span
						class="inline-block size-2 rounded-full"
						style:background={ENTITY_COLOR[ent as Entity] ?? ENTITY_COLOR.lagstiftning}
					></span>
					{entityLabel(ent)}
				</span>
			{/each}
		</div>
	{/if}
</div>
