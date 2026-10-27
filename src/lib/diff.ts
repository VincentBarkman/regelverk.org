export interface DiffLine {
	type: 'same' | 'add' | 'del';
	text: string;
}

const MAX_LINES = 3000;

export function diffLines(a: string, b: string): DiffLine[] | null {
	const A = a.split('\n');
	const B = b.split('\n');
	if (A.length > MAX_LINES || B.length > MAX_LINES) return null;

	const n = A.length;
	const m = B.length;
	const dp: number[] = new Array((n + 1) * (m + 1)).fill(0);
	const at = (i: number, j: number) => i * (m + 1) + j;

	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			dp[at(i, j)] =
				A[i] === B[j] ? dp[at(i + 1, j + 1)] + 1 : Math.max(dp[at(i + 1, j)], dp[at(i, j + 1)]);

	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (A[i] === B[j]) {
			out.push({ type: 'same', text: A[i] });
			i++;
			j++;
		} else if (dp[at(i + 1, j)] >= dp[at(i, j + 1)]) {
			out.push({ type: 'del', text: A[i++] });
		} else {
			out.push({ type: 'add', text: B[j++] });
		}
	}
	while (i < n) out.push({ type: 'del', text: A[i++] });
	while (j < m) out.push({ type: 'add', text: B[j++] });
	return out;
}
