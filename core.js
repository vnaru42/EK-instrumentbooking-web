export const overlaps=(a,b)=>a.start<=b.end&&b.start<=a.end;
export function conflicts(items,bookings,start,end,excludeId=null){return bookings.filter(b=>b.id!==excludeId&&['reserved','out'].includes(b.status)&&overlaps({start,end},b)&&b.items.some(i=>items.includes(i)));}
export function bookingColor(id){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return `hsl(${hash%360} 55% 43%)`;}
export function validateBooking({borrower,klass,ekid,start,end,items}){if(!borrower?.trim()||!klass?.trim()||!/^[a-z0-9]{3,20}$/i.test(ekid||''))return 'Udfyld navn, klasse og gyldigt EK-ID (fx clro1902)';if(!start||!end||end<start)return 'Ugyldig periode';if(!items?.length||new Set(items).size!==items.length)return 'Vælg mindst én unik udstyrsdel';return null;}
export function canBook(status,items,bookings,start,end){const hits=conflicts(items,bookings,start,end);return {ok:hits.length===0,conflicts:hits};}
