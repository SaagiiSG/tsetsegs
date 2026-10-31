/// <reference types="npm:@types/react" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as testEmail } from './test-email.tsx'
import { template as educatorDemoRequest } from './educator-demo-request.tsx'
import { template as supportRequest } from './support-request.tsx'
import { template as centerEmailCode } from './center-email-code.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'test-email': testEmail,
  'educator-demo-request': educatorDemoRequest,
  'support-request': supportRequest,
  'center-email-code': centerEmailCode,
}
