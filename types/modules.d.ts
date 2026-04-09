declare module 'docx' {
  export class Document {
    constructor(options: Record<string, unknown>)
  }
  export class Packer {
    static toBuffer(doc: Document): Promise<Buffer>
  }
  export class Paragraph {
    constructor(options: Record<string, unknown>)
  }
  export class TextRun {
    constructor(options: string | Record<string, unknown>)
  }
  export class HeadingLevel {
    static readonly HEADING_1: string
    static readonly HEADING_2: string
    static readonly HEADING_3: string
  }
  export class AlignmentType {
    static readonly CENTER: string
    static readonly LEFT: string
    static readonly RIGHT: string
  }
  export const SectionType: Record<string, string>
  export const PageBreak: unknown
}

declare module 'mammoth' {
  export function extractRawText(input: { buffer?: Buffer; arrayBuffer?: ArrayBuffer }): Promise<{ value: string }>
  export function convertToHtml(input: { buffer?: Buffer; arrayBuffer?: ArrayBuffer }): Promise<{ value: string }>
}

declare module 'react-markdown' {
  import type { FC, ReactNode } from 'react'
  interface ReactMarkdownProps {
    children: string
    className?: string
    components?: Record<string, FC<{ children?: ReactNode; [key: string]: unknown }>>
    [key: string]: unknown
  }
  const ReactMarkdown: FC<ReactMarkdownProps>
  export default ReactMarkdown
}
