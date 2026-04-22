export declare function useAnonId(): string;
declare const ANON_COLORS: {
    bg: string;
    ring: string;
    label: string;
}[];
export type AnonColorEntry = typeof ANON_COLORS[number] & {
    index: number;
};
export declare function buildAnonColorMap(anonIds: (string | null | undefined)[]): Map<string, AnonColorEntry>;
export {};
