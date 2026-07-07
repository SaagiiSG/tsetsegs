import { isOnlineClass } from '@/lib/classUtils';

export function getBatchSmsTemplate(batch: any): string {
  const batchLink = `https://flowersos.co/batch/${batch.unique_link_id}`;
  if (batch.course_type === 'IELTS') {
    return `Сайн байна уу? \n\nTsetsegs IELTS сургалтаас холбогдож байна. \n\nАнгийн мэдээлэл: ${batchLink}\n\nТус групт\n1. Бидний хэрэглэх ном (Google drive дотор)\n2. Цээжлэх үгс (Google drive дотор)\n3. ЭЕШ-д бэлдэх Англи хэл, Нийгмийн 700+ материал\n4. Сургалтын төлөвлөгөө зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nБаярлалаа.`;
  }
  if (isOnlineClass(batch.schedule)) {
    return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\n🌐 ONLINE CLASS\n\nClass Info: ${batchLink}\n\nХичээлийн хуваарь:\nMath (Online): Даваа/Лхагва/Баасан 18:40-20:30\nEnglish (үнэгүй): Бямба 18:30-20:00\n\nPlatform: Discord\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nУтас: 80660314, 88559876`;
  }
  return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\nClass Info: ${batchLink}\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nХаяг: Их Наяд Зүүн Өндөр 1114, ${batch.room} тоот\nУтас: 80660314, 88559876`;
}

// Rough SMS segment count. Cyrillic → UCS-2 (70 single / 67 concatenated).
// ASCII/GSM-7 → 160 single / 153 concatenated.
export function estimateSegments(body: string): { segments: number; encoding: 'GSM-7' | 'UCS-2' } {
  const isUcs2 = /[^\u0000-\u007F]/.test(body);
  const len = body.length;
  if (isUcs2) {
    const seg = len <= 70 ? 1 : Math.ceil(len / 67);
    return { segments: seg, encoding: 'UCS-2' };
  }
  const seg = len <= 160 ? 1 : Math.ceil(len / 153);
  return { segments: seg, encoding: 'GSM-7' };
}

// Twilio price per segment to Mongolia (approx, USD).
export const MN_SMS_PRICE_PER_SEGMENT = 0.0808;
