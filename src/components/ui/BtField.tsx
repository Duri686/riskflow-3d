import type {
	InputHTMLAttributes,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

const fieldBaseClass =
	"w-full appearance-none border border-[var(--color-bt-border)] bg-[var(--color-bt-input)] px-4 text-base text-[var(--color-bt-foreground)] outline-none transition-colors duration-150 ease-[var(--ease-bt)] placeholder:text-[var(--color-bt-muted-foreground)] focus:border-[var(--color-bt-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] disabled:cursor-not-allowed disabled:opacity-50";

type BtInputProps = InputHTMLAttributes<HTMLInputElement>;

export const BtInput = ({ className, ...props }: BtInputProps) => {
	return (
		<input
			className={combineClasses(fieldBaseClass, "h-12 md:h-14", className)}
			{...props}
		/>
	);
};

type BtSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const BtSelect = ({ className, children, ...props }: BtSelectProps) => {
	return (
		<select
			className={combineClasses(
				fieldBaseClass,
				"h-12 pr-10 leading-5 md:h-14",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
};

type BtTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const BtTextArea = ({ className, ...props }: BtTextAreaProps) => {
	return (
		<textarea
			className={combineClasses(
				fieldBaseClass,
				"min-h-32 resize-y py-3 text-base leading-relaxed",
				className,
			)}
			{...props}
		/>
	);
};
