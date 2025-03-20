declare function _(id: string): string;

declare interface String {
  format(...replacements: string[]): string;
  format(...replacements: number[]): string;
}
