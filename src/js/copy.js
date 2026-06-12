function copyTextWithTextarea(text) {
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.top = '-9999px';
	document.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	try {
		if (!document.execCommand('copy')) {
			throw new Error('execCommand(copy) returned false');
		}
	} finally {
		document.body.removeChild(textarea);
	}
}

export async function copyTextToClipboard(text) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
	} catch (error) {
		// Fall back to the legacy textarea path if the clipboard API is blocked or unavailable.
	}

	copyTextWithTextarea(text);
}

export function flashCopyFeedback(button, options = {}) {
	if (!button) {
		return;
	}

	const { duration = 2000 } = options;
	const iconNode = button.querySelector('x-icon-copy, x-icon-check, svg');
	const originalMarkup = button.innerHTML;

	if (!iconNode) {
		return;
	}

	const iconClasses = iconNode.getAttribute('class') || iconNode.className || 'h-4 w-4';
	const replacementMarkup = `<x-icon-check class="${iconClasses} text-emerald-500" aria-hidden="true"></x-icon-check>`;

	button.innerHTML = originalMarkup.replace(iconNode.outerHTML, replacementMarkup);

	window.setTimeout(() => {
		button.innerHTML = originalMarkup;
	}, duration);
}
