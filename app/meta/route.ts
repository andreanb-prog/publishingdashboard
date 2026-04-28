import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

export async function GET() {
  const html = readFileSync(path.join(process.cwd(), 'public/meta-analyzer.html'), 'utf-8')
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
