import { BookingStatus } from '../bookings/entities/booking.entity';
import { TourType } from '../tours/entities/tour.entity';

type ItineraryItem = {
  day?: number;
  time: string;
  title: string;
  description: string;
};

type ScheduleSeed = {
  startDate: string;
  endDate: string;
  timeSlot: string | null;
  roundName: string | null;
  maxCapacity: number;
  currentBooked: number;
};

export type TourSeed = {
  tourCode: string;
  name: string;
  description: string;
  tourType: TourType;
  categories: string[];
  price: number;
  childPrice: number | null;
  minPeople: number | null;
  maxPeople: number | null;
  originalPrice: number | null;
  images: string[];
  highlights: string[];
  itinerary: ItineraryItem[];
  transportation: string;
  duration: string;
  region: string;
  province: string;
  accommodation: string | null;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  schedules: ScheduleSeed[];
};

type TourConfig = Omit<TourSeed, 'images' | 'schedules'> & {
  imageKeyword: string;
  scheduleType: 'one_day' | 'one_day_rounds' | 'package';
  baseOffset: number;
  seats: number;
  bookedValues: number[];
  tripDays?: number;
};

const baseDate = new Date('2026-04-05T00:00:00.000Z');

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(offset: number) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDate(date);
}

// Maps seed keywords to loremflickr-friendly search terms + lock numbers
// loremflickr.com/W/H/{keywords}/lock/{n} → keyword-matched, deterministic image
const IMAGE_KEYWORD_MAP: Record<string, [string, string, string]> = {
  'phuket-old-town':     ['phuket,beach', 'phuket,oldtown', 'phuket,sea'],
  'cheow-lan-lake':      ['lake,thailand', 'kayak,lake', 'raft,water'],
  'chiang-mai-mountain': ['chiangmai,temple', 'chiangmai,mountain', 'chiangmai,cafe'],
  'krabi-island':        ['krabi,island', 'krabi,beach', 'krabi,sea'],
  'atv-phuket':          ['atv,adventure', 'phuket,viewpoint', 'offroad,jungle'],
  'chiang-rai-temple':   ['chiangrai,temple', 'whitetemple,chiangrai', 'blackhouse,chiangrai'],
  'kanchanaburi-river':  ['river,thailand', 'kanchanaburi,bridge', 'rafting,river'],
  'ayutthaya-temple':    ['ayutthaya,temple', 'ancient,ruins', 'boat,river'],
  'khao-kho-mountain':   ['mountain,fog', 'highland,thailand', 'flower,mountain'],
  'pattaya-island':      ['pattaya,beach', 'island,sea', 'seafood,dinner'],
  'nan-temple':          ['nan,temple', 'northern,thailand', 'salt,village'],
  'chanthaburi-fruit':   ['crab,seafood', 'fruit,garden', 'riverside,community'],
  'loei-mekong':         ['mekong,river', 'loei,walking', 'skywalk,viewpoint'],
  'huahin-beach':        ['huahin,beach', 'train,cafe', 'night,market'],
  'mae-kampong-nature':  ['waterfall,forest', 'homestay,mountain', 'coffee,garden'],
  'nakhon-nayok-nature': ['waterfall,nature', 'atv,park', 'cafe,garden'],
  'phangnga-bay':        ['phangnga,bay', 'limestone,sea', 'sunset,cruise'],
  'ubon-temple-mekong':  ['temple,thailand', 'mekong,ubon', 'stone,river'],
  'rayong-beach-fruit':  ['rayong,beach', 'fruit,orchard', 'island,dinner'],
  'phrae-lampang':       ['wooden,house', 'lampang,history', 'horse,carriage'],
  'chumphon-diving':     ['snorkeling,sea', 'coral,reef', 'island,coffee'],
  'sukhothai-cycling':   ['sukhothai,ruins', 'cycling,park', 'ancient,thailand'],
  'trang-island':        ['trang,island', 'emerald,cave', 'boat,lunch'],
  'ratchaburi-farm':     ['farm,nature', 'ratchaburi,farm', 'cabin,mountain'],
  'buriram-temple':      ['stone,temple', 'rice,field', 'local,food'],
  'chiang-mai-private':  ['doi,suthep', 'private,tour', 'northern,dinner'],
  'samui-beach':         ['samui,beach', 'bigbuddha,samui', 'samui,cafe'],
  'pai-mountain':        ['pai,mountain', 'bamboo,bridge', 'valley,cafe'],
  'suphanburi-flower':   ['flower,field', 'old,market', 'garden,restaurant'],
  'khaoyai-nature':      ['khaoyai,nature', 'vineyard,wine', 'mountain,resort'],
};

function createImageSet(keyword: string): string[] {
  const terms = IMAGE_KEYWORD_MAP[keyword];
  if (!terms) {
    // Fallback: use keyword directly
    return [
      `https://loremflickr.com/800/600/${keyword}/lock/1`,
      `https://loremflickr.com/800/600/${keyword}/lock/2`,
      `https://loremflickr.com/800/600/${keyword}/lock/3`,
    ];
  }
  // Each image uses a different keyword term, lock number offset by 10 per image to vary results
  const lockBase = Math.abs(keyword.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 90 + 10;
  return [
    `https://loremflickr.com/800/600/${terms[0]}/lock/${lockBase}`,
    `https://loremflickr.com/800/600/${terms[1]}/lock/${lockBase + 1}`,
    `https://loremflickr.com/800/600/${terms[2]}/lock/${lockBase + 2}`,
  ];
}

function buildSchedules(config: Pick<TourConfig, 'scheduleType' | 'baseOffset' | 'seats' | 'bookedValues' | 'tripDays'>): ScheduleSeed[] {
  if (config.scheduleType === 'package') {
    return config.bookedValues.map((currentBooked, index) => {
      const offset = config.baseOffset + index * 10;
      return {
        startDate: addDays(offset),
        endDate: addDays(offset + (config.tripDays || 2) - 1),
        timeSlot: null,
        roundName: 'รอบเดินทางหลัก',
        maxCapacity: config.seats,
        currentBooked,
      };
    });
  }

  return config.bookedValues.flatMap((currentBooked, index) => {
    const startDate = addDays(config.baseOffset + index * 7);
    if (config.scheduleType === 'one_day_rounds') {
      return [
        { startDate, endDate: startDate, timeSlot: '08:00-12:00', roundName: 'รอบเช้า', maxCapacity: config.seats, currentBooked },
        { startDate, endDate: startDate, timeSlot: '13:30-17:30', roundName: 'รอบบ่าย', maxCapacity: config.seats, currentBooked: Math.max(0, currentBooked - 2) },
      ];
    }

    return [{ startDate, endDate: startDate, timeSlot: '08:00-18:00', roundName: 'รอบปกติ', maxCapacity: config.seats, currentBooked }];
  });
}

const tourConfigs: TourConfig[] = [
  {
    tourCode: '09042026001',
    name: 'ภูเก็ตเมืองเก่า คาเฟ่ลับ และจุดชมวิวพระอาทิตย์ตก',
    description: 'เดินเล่นย่านเมืองเก่าภูเก็ตแบบไม่เร่งรีบ แวะคาเฟ่โทนอบอุ่น ชิมของพื้นถิ่น และปิดวันด้วยวิวทะเลยามเย็นที่แหลมพรหมเทพ',
    tourType: TourType.ONE_DAY,
    categories: ['คาเฟ่', 'ชิล', 'ถ่ายรูป'],
    price: 2890, childPrice: 2190, minPeople: null, maxPeople: null, originalPrice: 3290,
    imageKeyword: 'phuket-old-town',
    highlights: ['เดินเมืองเก่าพร้อมไกด์ท้องถิ่น', 'รวมอาหารกลางวันและเครื่องดื่ม 1 แก้ว', 'มีเวลาถ่ายรูปแบบไม่เร่งรีบ'],
    itinerary: [
      { time: '09:00', title: 'เริ่มต้นที่ย่านเมืองเก่า', description: 'เดินชมตึกเก่า คาเฟ่เล็ก ๆ และมุมถ่ายรูปที่คัดมาแล้ว' },
      { time: '12:00', title: 'พักกลางวันร้านพื้นเมือง', description: 'เสิร์ฟอาหารใต้รสกลมกล่อมในบรรยากาศสบาย ๆ' },
      { time: '17:15', title: 'ชมพระอาทิตย์ตก', description: 'ปิดท้ายวันที่จุดชมวิวทะเลพร้อมลมเย็นสบาย' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคใต้', province: 'ภูเก็ต', accommodation: null,
    rating: 4.7, reviewCount: 128, isActive: true, scheduleType: 'one_day', baseOffset: 3, seats: 20, bookedValues: [8, 12, 14, 10],
  },
  {
    tourCode: '09042026002',
    name: 'เขื่อนเชี่ยวหลาน ล่องเรือเช้า สะพานแพ และพายคายักเบา ๆ',
    description: 'ทริปธรรมชาติสำหรับคนอยากพักสายตา ล่องเรือชมภูเขาหินปูนเหนือผืนน้ำสีเขียว พร้อมกิจกรรมคายักแบบสบาย ๆ',
    tourType: TourType.ONE_DAY,
    categories: ['ธรรมชาติ', 'ชิล', 'ล่องเรือ'],
    price: 1990, childPrice: 1490, minPeople: null, maxPeople: null, originalPrice: 2290,
    imageKeyword: 'cheow-lan-lake',
    highlights: ['ล่องเรือชมวิวเขาสามเกลอ', 'มีเรือคายักให้ลองพาย', 'เหมาะกับคนอยากพักผ่อนเงียบ ๆ'],
    itinerary: [
      { time: '08:30', title: 'ลงเรือที่ท่าเชี่ยวหลาน', description: 'เริ่มทริปด้วยวิวอ่างเก็บน้ำยามเช้าที่สวยมาก' },
      { time: '11:00', title: 'แวะจุดพักกลางแพ', description: 'มีเวลาถ่ายรูป เดินเล่น และเล่นน้ำได้ตามอัธยาศัย' },
      { time: '14:00', title: 'กิจกรรมคายัก', description: 'พายรอบแพระยะสั้น เหมาะกับมือใหม่และครอบครัว' },
    ],
    transportation: 'รถตู้ + เรือหางยาว', duration: '1 วัน', region: 'ภาคใต้', province: 'สุราษฎร์ธานี', accommodation: null,
    rating: 4.8, reviewCount: 176, isActive: true, scheduleType: 'one_day', baseOffset: 5, seats: 24, bookedValues: [11, 16, 18, 13],
  },
  {
    tourCode: '09042026003',
    name: 'เชียงใหม่ 3 วัน 2 คืน ดอย คาเฟ่ และถนนคนเดินแบบพอดี ๆ',
    description: 'แพ็กเกจเชียงใหม่ที่จัดจังหวะเที่ยวมาให้พอดี มีทั้งดอยอินทนนท์ คาเฟ่วิวดี และเวลาพักแบบไม่แน่นจนเหนื่อย',
    tourType: TourType.PACKAGE,
    categories: ['ภูเขา', 'คาเฟ่', 'พักผ่อน'],
    price: 7590, childPrice: 6290, minPeople: null, maxPeople: null, originalPrice: 8290,
    imageKeyword: 'chiang-mai-mountain',
    highlights: ['พักโรงแรมย่านนิมมาน 2 คืน', 'ขึ้นดอยอินทนนท์พร้อมไกด์', 'มีเวลาช้อปถนนคนเดิน'],
    itinerary: [
      { day: 1, time: '10:00', title: 'เริ่มเที่ยวในเมือง', description: 'รับจากสนามบิน แวะกินอาหารเหนือและเข้าที่พัก' },
      { day: 2, time: '08:00', title: 'เที่ยวดอยอินทนนท์', description: 'ชมพระมหาธาตุ น้ำตก และอากาศเย็นสบายบนยอดดอย' },
      { day: 3, time: '09:30', title: 'คาเฟ่และของฝากก่อนกลับ', description: 'แวะคาเฟ่สวยและซื้อของฝากก่อนส่งสนามบิน' },
    ],
    transportation: 'รถตู้ส่วนตัว', duration: '3 วัน 2 คืน', region: 'ภาคเหนือ', province: 'เชียงใหม่',
    accommodation: 'โรงแรมบูทีคย่านนิมมาน ระดับ 4 ดาว พร้อมอาหารเช้า',
    rating: 4.9, reviewCount: 214, isActive: true, scheduleType: 'package', baseOffset: 7, seats: 18, bookedValues: [10, 12, 15], tripDays: 3,
  },
  {
    tourCode: '09042026004',
    name: 'กระบี่ 4 เกาะ เล่นน้ำใส ถ่ายรูปหน้าหาด และกินซีฟู้ดมื้อเย็น',
    description: 'รวมเกาะสวยยอดนิยมของกระบี่ในวันเดียว เดินทางสบาย เหมาะกับคนอยากได้ทั้งทะเลและรูปสวยกลับบ้าน',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ถ่ายรูป', 'กิจกรรม'],
    price: 2390, childPrice: 1790, minPeople: null, maxPeople: null, originalPrice: 2690,
    imageKeyword: 'krabi-island',
    highlights: ['นั่งเรือสปีดโบ๊ตเที่ยว 4 เกาะ', 'มีหน้ากากดำน้ำและเสื้อชูชีพ', 'ปิดท้ายด้วยมื้อเย็นซีฟู้ด'],
    itinerary: [
      { time: '08:00', title: 'ออกเรือจากอ่าวนาง', description: 'เช็กอุปกรณ์และฟังบรีฟความปลอดภัยก่อนออกเดินทาง' },
      { time: '11:30', title: 'เล่นน้ำและถ่ายรูป', description: 'มีเวลาแวะตามจุดยอดนิยมแบบไม่รีบจนเกินไป' },
      { time: '18:00', title: 'มื้อเย็นริมทะเล', description: 'จบทริปด้วยซีฟู้ดง่าย ๆ ริมหาดก่อนกลับที่พัก' },
    ],
    transportation: 'รถรับส่ง + เรือสปีดโบ๊ต', duration: '1 วัน', region: 'ภาคใต้', province: 'กระบี่', accommodation: null,
    rating: 4.6, reviewCount: 163, isActive: true, scheduleType: 'one_day', baseOffset: 4, seats: 26, bookedValues: [9, 17, 19, 14],
  },
  {
    tourCode: '09042026005',
    name: 'ขับ ATV ชมวิวภูเก็ต และแวะคาเฟ่ริมเขา',
    description: 'เหมาะกับคนชอบกิจกรรมที่ไม่หนักเกินไป ได้ทั้งขับ ATV ทางธรรมชาติและมีเวลานั่งพักถ่ายรูปสวย ๆ',
    tourType: TourType.ONE_DAY,
    categories: ['ผจญภัย', 'กิจกรรม', 'คาเฟ่'],
    price: 1690, childPrice: null, minPeople: 2, maxPeople: 6, originalPrice: 1990,
    imageKeyword: 'atv-phuket',
    highlights: ['ขับ ATV เส้นทางธรรมชาติ', 'เหมาะกับกลุ่มเพื่อนหรือครอบครัวเล็ก', 'มีคาเฟ่วิวเขาให้พักต่อ'],
    itinerary: [
      { time: '09:00', title: 'ฝึกขับและทดลองสนาม', description: 'เริ่มจากการสอนใช้งานพื้นฐานเพื่อให้ขับได้อย่างมั่นใจ' },
      { time: '10:00', title: 'ขับเส้นทางชมวิว', description: 'พาเข้าทางดินและทางขึ้นเนินแบบไม่โหดเกินไป' },
      { time: '12:00', title: 'พักคาเฟ่ริมเขา', description: 'ปิดท้ายด้วยเครื่องดื่มเย็น ๆ และวิวเปิดโล่งของภูเก็ต' },
    ],
    transportation: 'รถรับส่งในโซนกะตะ-กะรน', duration: 'ครึ่งวัน', region: 'ภาคใต้', province: 'ภูเก็ต', accommodation: null,
    rating: 4.5, reviewCount: 92, isActive: true, scheduleType: 'one_day_rounds', baseOffset: 6, seats: 6, bookedValues: [2, 4, 3],
  },
  {
    tourCode: '09042026006',
    name: 'เชียงรายวันเดียว วัดร่องขุ่น บ้านดำ และคาเฟ่วิวทุ่งนา',
    description: 'ทริปสำหรับคนอยากเที่ยวเชียงรายแบบครบในหนึ่งวัน ได้ทั้งงานศิลป์ จุดเช็กอิน และคาเฟ่บรรยากาศดี',
    tourType: TourType.ONE_DAY,
    categories: ['วัฒนธรรม', 'คาเฟ่', 'ถ่ายรูป'],
    price: 2190, childPrice: 1590, minPeople: null, maxPeople: null, originalPrice: null,
    imageKeyword: 'chiang-rai-temple',
    highlights: ['เข้าเที่ยววัดร่องขุ่นและบ้านดำ', 'มีเวลาชิมกาแฟและของหวาน', 'เส้นทางไม่เร่งเกินไป'],
    itinerary: [
      { time: '08:30', title: 'เริ่มต้นที่วัดร่องขุ่น', description: 'พาชมงานศิลป์และแนะนำมุมถ่ายรูปที่สวยที่สุด' },
      { time: '11:30', title: 'แวะบ้านดำ', description: 'เดินชมงานศิลป์อีกอารมณ์หนึ่งที่มีเอกลักษณ์ชัดเจน' },
      { time: '14:30', title: 'พักคาเฟ่วิวทุ่งนา', description: 'เติมพลังช่วงบ่ายก่อนเดินทางกลับเข้าเมือง' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคเหนือ', province: 'เชียงราย', accommodation: null,
    rating: 4.7, reviewCount: 109, isActive: true, scheduleType: 'one_day', baseOffset: 8, seats: 18, bookedValues: [8, 9, 12, 11],
  },
  {
    tourCode: '09042026007',
    name: 'กาญจนบุรี 2 วัน 1 คืน พักแพริมน้ำ ล่องแพเปียกและคาเฟ่แม่น้ำ',
    description: 'แพ็กเกจสั้น ๆ สำหรับคนอยากหนีเมืองมาพักริมน้ำ ได้เล่นกิจกรรมเบา ๆ และนอนแพบรรยากาศดี',
    tourType: TourType.PACKAGE,
    categories: ['พักผ่อน', 'ธรรมชาติ', 'ชิล'],
    price: 4590, childPrice: 3490, minPeople: null, maxPeople: null, originalPrice: 4990,
    imageKeyword: 'kanchanaburi-river',
    highlights: ['พักแพริมน้ำ 1 คืน', 'มีกิจกรรมล่องแพเปียก', 'เหมาะกับคู่รักและครอบครัว'],
    itinerary: [
      { day: 1, time: '09:00', title: 'ออกเดินทางจากกรุงเทพฯ', description: 'แวะคาเฟ่ริมแม่น้ำและเช็กอินเข้าที่พักช่วงบ่าย' },
      { day: 1, time: '16:00', title: 'ล่องแพเปียก', description: 'กิจกรรมสนุกแบบไม่หนักมาก เล่นน้ำได้ตามอัธยาศัย' },
      { day: 2, time: '10:00', title: 'เที่ยวจุดชมวิวก่อนกลับ', description: 'เก็บบรรยากาศริมเขื่อนและซื้อของฝากก่อนเดินทางกลับ' },
    ],
    transportation: 'รถตู้ VIP', duration: '2 วัน 1 คืน', region: 'ภาคตะวันตก', province: 'กาญจนบุรี',
    accommodation: 'แพริมน้ำพร้อมห้องพักส่วนตัวและอาหารเช้า',
    rating: 4.6, reviewCount: 87, isActive: true, scheduleType: 'package', baseOffset: 9, seats: 16, bookedValues: [7, 10, 12], tripDays: 2,
  },
  {
    tourCode: '09042026008',
    name: 'อยุธยาไหว้พระ ถ่ายรูปชุดไทย และล่องเรือชมเกาะเมือง',
    description: 'ทริปวันเดียวที่ผสมทั้งไหว้พระ คาเฟ่ และกิจกรรมล่องเรือ เหมาะกับคนอยากเที่ยวอยุธยาแบบได้ครบหลายอารมณ์',
    tourType: TourType.ONE_DAY,
    categories: ['วัฒนธรรม', 'ชิล', 'ถ่ายรูป'],
    price: 1790, childPrice: 1290, minPeople: null, maxPeople: null, originalPrice: 2090,
    imageKeyword: 'ayutthaya-temple',
    highlights: ['มีบริการเช่าชุดไทยราคาพิเศษ', 'ล่องเรือชมเกาะเมืองช่วงเย็น', 'รวมมื้อกลางวันร้านท้องถิ่น'],
    itinerary: [
      { time: '09:00', title: 'ไหว้พระและเดินชมโบราณสถาน', description: 'เลือกจุดสำคัญที่เดินสะดวกและได้รูปสวย' },
      { time: '12:30', title: 'พักกลางวันร้านกุ้งแม่น้ำ', description: 'เมนูท้องถิ่นที่คนมาเที่ยวชอบแวะเป็นประจำ' },
      { time: '16:30', title: 'ล่องเรือรอบเกาะเมือง', description: 'ชมวัดและบ้านเรือนริมแม่น้ำในบรรยากาศยามเย็น' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคกลาง', province: 'พระนครศรีอยุธยา', accommodation: null,
    rating: 4.5, reviewCount: 143, isActive: true, scheduleType: 'one_day', baseOffset: 2, seats: 22, bookedValues: [12, 14, 16, 10],
  },
  {
    tourCode: '09042026009',
    name: 'เขาค้อ 2 วัน 1 คืน ทะเลหมอก คาเฟ่กระจก และสวนดอกไม้',
    description: 'เหมาะกับคนชอบอากาศเย็น วิวภูเขา และที่พักน่ารัก เดินทางง่ายและมีเวลาพักจริง ไม่อัดโปรแกรมมาก',
    tourType: TourType.PACKAGE,
    categories: ['ภูเขา', 'คาเฟ่', 'พักผ่อน'],
    price: 4990, childPrice: 3890, minPeople: null, maxPeople: null, originalPrice: 5590,
    imageKeyword: 'khao-kho',
    highlights: ['นอนรีสอร์ตวิวทะเลหมอก', 'แวะคาเฟ่กระจกยอดนิยม', 'เดินเล่นสวนดอกไม้ถ่ายรูปสบาย ๆ'],
    itinerary: [
      { day: 1, time: '11:00', title: 'ขึ้นเขาค้อและแวะคาเฟ่', description: 'พักดื่มกาแฟ ชมวิวเขาซ้อน และถ่ายรูปก่อนเข้าที่พัก' },
      { day: 1, time: '17:30', title: 'ชมพระอาทิตย์ลับฟ้า', description: 'บรรยากาศเย็นสบาย เหมาะกับการพักผ่อนแบบช้า ๆ' },
      { day: 2, time: '06:00', title: 'ดูทะเลหมอกยามเช้า', description: 'ตื่นเช้าไปจุดชมวิวและกลับมาทานอาหารเช้าที่รีสอร์ต' },
    ],
    transportation: 'รถตู้ VIP', duration: '2 วัน 1 คืน', region: 'ภาคเหนือ', province: 'เพชรบูรณ์',
    accommodation: 'รีสอร์ตวิวเขาค้อพร้อมอาหารเช้า',
    rating: 4.8, reviewCount: 121, isActive: true, scheduleType: 'package', baseOffset: 12, seats: 14, bookedValues: [9, 11, 12], tripDays: 2,
  },
  {
    tourCode: '09042026010',
    name: 'พัทยาเกาะล้าน เล่นน้ำ ถ่ายรูปคาเฟ่ริมทะเล และซีฟู้ดเย็น',
    description: 'เที่ยวทะเลใกล้กรุงเทพฯ แบบจัดให้ครบทั้งสปีดโบ๊ต คาเฟ่ และมื้อเย็นริมทะเล เหมาะกับคนมีเวลาน้อยแต่ยังอยากพักใจ',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ชิล', 'ถ่ายรูป'],
    price: 1690, childPrice: 1190, minPeople: null, maxPeople: null, originalPrice: 1890,
    imageKeyword: 'koh-larn',
    highlights: ['นั่งสปีดโบ๊ตไปกลับ', 'รวมเก้าอี้ชายหาดและเครื่องดื่ม', 'มีเวลาพักผ่อนบนเกาะจริง'],
    itinerary: [
      { time: '08:00', title: 'ออกจากท่าเรือพัทยา', description: 'เดินทางสู่เกาะล้านแบบรวดเร็วและสะดวก' },
      { time: '10:30', title: 'เล่นน้ำและพักคาเฟ่', description: 'เลือกลงหาดหรือแวะคาเฟ่ก่อนก็ได้ตามสไตล์ที่ชอบ' },
      { time: '18:00', title: 'มื้อเย็นริมทะเล', description: 'จบทริปแบบสบาย ๆ กับซีฟู้ดง่าย ๆ และลมทะเลเย็น ๆ' },
    ],
    transportation: 'รถตู้ + เรือสปีดโบ๊ต', duration: '1 วัน', region: 'ภาคตะวันออก', province: 'ชลบุรี', accommodation: null,
    rating: 4.4, reviewCount: 188, isActive: true, scheduleType: 'one_day', baseOffset: 1, seats: 28, bookedValues: [14, 18, 20, 17],
  },
  {
    tourCode: '09042026011',
    name: 'น่านเนิบ ๆ 3 วัน 2 คืน วัดภูมินทร์ ถนนคนเดิน และบ่อเกลือ',
    description: 'ทริปสำหรับคนอยากเที่ยวเมืองเล็กแบบใจเย็น ได้ทั้งในเมืองน่าน คาเฟ่เล็ก ๆ และเส้นทางธรรมชาติที่ไม่รีบเกินไป',
    tourType: TourType.PACKAGE,
    categories: ['วัฒนธรรม', 'พักผ่อน', 'ธรรมชาติ'],
    price: 6890, childPrice: 5590, minPeople: 4, maxPeople: 8, originalPrice: 7390,
    imageKeyword: 'nan-thailand',
    highlights: ['เที่ยวเมืองน่านแบบจังหวะสบาย', 'แวะบ่อเกลือและคาเฟ่วิวเขา', 'เหมาะกับกลุ่มเพื่อนหรือครอบครัว'],
    itinerary: [
      { day: 1, time: '11:00', title: 'เดินเล่นในเมืองน่าน', description: 'แวะวัดภูมินทร์ พิพิธภัณฑ์ และคาเฟ่เล็ก ๆ ในตัวเมือง' },
      { day: 2, time: '08:30', title: 'ขึ้นเส้นทางบ่อเกลือ', description: 'ชมวิวภูเขา แวะจุดถ่ายรูป และเดินชิมของท้องถิ่น' },
      { day: 3, time: '09:00', title: 'ซื้อของฝากก่อนกลับ', description: 'เก็บของฝากพื้นเมืองและเดินทางกลับแบบไม่เร่งรีบ' },
    ],
    transportation: 'รถตู้ส่วนตัว', duration: '3 วัน 2 คืน', region: 'ภาคเหนือ', province: 'น่าน',
    accommodation: 'ที่พักสไตล์โฮมมี่กลางเมืองน่านพร้อมอาหารเช้า',
    rating: 4.9, reviewCount: 72, isActive: true, scheduleType: 'package', baseOffset: 15, seats: 8, bookedValues: [4, 6, 7], tripDays: 3,
  },
  {
    tourCode: '09042026012',
    name: 'จันทบุรีกินปู ดูชุมชนริมน้ำ และสวนผลไม้ตามฤดูกาล',
    description: 'ทัวร์กินเที่ยวที่เน้นบรรยากาศท้องถิ่น เดินชุมชนเก่า ชิมผลไม้ และปิดท้ายด้วยมื้อปูแบบจุใจ',
    tourType: TourType.ONE_DAY,
    categories: ['ของกิน', 'วัฒนธรรม', 'ชิล'],
    price: 1890, childPrice: 1390, minPeople: null, maxPeople: null, originalPrice: null,
    imageKeyword: 'chanthaburi',
    highlights: ['กินปูและซีฟู้ดแบบจัดเต็ม', 'เดินชุมชนริมน้ำจันทบูร', 'แวะสวนผลไม้ตามฤดูกาล'],
    itinerary: [
      { time: '09:30', title: 'เดินชุมชนริมน้ำจันทบูร', description: 'ชมบ้านเก่า ร้านขนม และบรรยากาศเมืองเก่าที่มีเสน่ห์มาก' },
      { time: '12:30', title: 'มื้อกลางวันปูเน้น ๆ', description: 'ร้านดังที่คัดวัตถุดิบสดทุกวัน รสชาติไม่จัดเกินไป' },
      { time: '15:30', title: 'แวะสวนผลไม้', description: 'ขึ้นอยู่กับฤดูกาล อาจเป็นทุเรียน เงาะ หรือมังคุด' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคตะวันออก', province: 'จันทบุรี', accommodation: null,
    rating: 4.6, reviewCount: 98, isActive: true, scheduleType: 'one_day', baseOffset: 11, seats: 20, bookedValues: [10, 12, 13, 9],
  },
  {
    tourCode: '09042026013',
    name: 'เลยเชียงคาน 2 วัน 1 คืน ถนนคนเดิน ริมโขง และสกายวอล์ก',
    description: 'แพ็กเกจเที่ยวเชียงคานแบบไม่เหนื่อย ได้สัมผัสเมืองเล็กริมโขง กินอาหารพื้นถิ่น และนอนโฮมสเตย์บรรยากาศดี',
    tourType: TourType.PACKAGE,
    categories: ['พักผ่อน', 'วัฒนธรรม', 'ชิล'],
    price: 4390, childPrice: 3390, minPeople: null, maxPeople: null, originalPrice: 4790,
    imageKeyword: 'chiang-khan',
    highlights: ['นอนโฮมสเตย์ริมโขง', 'เดินถนนคนเดินเชียงคาน', 'ชมวิวสกายวอล์กยามเช้า'],
    itinerary: [
      { day: 1, time: '15:00', title: 'เช็กอินและเดินเล่นริมโขง', description: 'พักผ่อนแบบสบาย ๆ ก่อนออกไปถนนคนเดินช่วงเย็น' },
      { day: 1, time: '18:00', title: 'เดินถนนคนเดินเชียงคาน', description: 'มีเวลาซื้อของกินเล่น ของฝาก และถ่ายรูปบ้านไม้เก่า' },
      { day: 2, time: '06:30', title: 'ชมวิวสกายวอล์ก', description: 'ตื่นเช้ามาดูหมอกและวิวโค้งน้ำโขงก่อนเดินทางกลับ' },
    ],
    transportation: 'รถตู้ VIP', duration: '2 วัน 1 คืน', region: 'ภาคตะวันออกเฉียงเหนือ', province: 'เลย',
    accommodation: 'โฮมสเตย์ริมน้ำโขงพร้อมอาหารเช้า',
    rating: 4.7, reviewCount: 84, isActive: true, scheduleType: 'package', baseOffset: 14, seats: 14, bookedValues: [8, 9, 11], tripDays: 2,
  },
  {
    tourCode: '09042026014',
    name: 'หัวหินนั่งรถไฟเช้า คาเฟ่ริมทะเล และตลาดโต้รุ่ง',
    description: 'ทริปเบา ๆ สำหรับคนอยากเปลี่ยนบรรยากาศจากกรุงเทพฯ มาเที่ยวทะเลแบบเรียบง่าย มีทั้งคาเฟ่ ตลาด และเวลาพัก',
    tourType: TourType.ONE_DAY,
    categories: ['ชิล', 'ทะเล', 'ของกิน'],
    price: 1590, childPrice: 1090, minPeople: null, maxPeople: null, originalPrice: 1790,
    imageKeyword: 'hua-hin',
    highlights: ['แวะคาเฟ่ริมทะเลยอดนิยม', 'เดินเล่นตลาดโต้รุ่งหัวหิน', 'โปรแกรมไม่แน่นจนเกินไป'],
    itinerary: [
      { time: '08:30', title: 'ถึงหัวหินและเริ่มเที่ยวเบา ๆ', description: 'แวะจุดเช็กอินริมทะเลก่อนเข้าคาเฟ่ช่วงสาย' },
      { time: '13:00', title: 'เวลาว่างบนชายหาด', description: 'เดินเล่น พักผ่อน หรือหาของกินได้ตามสบาย' },
      { time: '18:00', title: 'เดินตลาดโต้รุ่ง', description: 'ชิมอาหารทะเลและของกินเล่นในบรรยากาศคึกคักพอดี ๆ' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคตะวันตก', province: 'ประจวบคีรีขันธ์', accommodation: null,
    rating: 4.3, reviewCount: 154, isActive: true, scheduleType: 'one_day', baseOffset: 10, seats: 20, bookedValues: [9, 11, 13, 12],
  },
  {
    tourCode: '09042026015',
    name: 'แม่กำปอง 2 วัน 1 คืน นอนโฮมสเตย์ เดินป่าเบา ๆ และจิบกาแฟ',
    description: 'เหมาะกับคนอยากพักจากความวุ่นวาย ได้ใช้เวลาอยู่กับธรรมชาติ สูดอากาศดี และกินอาหารพื้นบ้านแบบอบอุ่น',
    tourType: TourType.PACKAGE,
    categories: ['ธรรมชาติ', 'พักผ่อน', 'คาเฟ่'],
    price: 5290, childPrice: 4190, minPeople: 2, maxPeople: 6, originalPrice: 5690,
    imageKeyword: 'mae-kampong',
    highlights: ['พักโฮมสเตย์บรรยากาศเงียบ', 'เดินป่าเส้นทางง่าย', 'แวะคาเฟ่ลำธาร'],
    itinerary: [
      { day: 1, time: '11:00', title: 'ขึ้นแม่กำปองและเข้าที่พัก', description: 'ใช้เวลาบนหมู่บ้านแบบสบาย ๆ ไม่ต้องรีบตามเวลา' },
      { day: 1, time: '15:00', title: 'เดินเล่นรอบหมู่บ้าน', description: 'แวะลำธาร ร้านกาแฟ และมุมถ่ายรูปที่คนน้อย' },
      { day: 2, time: '08:00', title: 'เดินป่าเบา ๆ ก่อนกลับ', description: 'เส้นทางสั้น เหมาะกับคนอยากขยับตัวแต่ไม่หนักมาก' },
    ],
    transportation: 'รถตู้ส่วนตัว', duration: '2 วัน 1 คืน', region: 'ภาคเหนือ', province: 'เชียงใหม่',
    accommodation: 'โฮมสเตย์แม่กำปองพร้อมอาหารเย็นและอาหารเช้า',
    rating: 4.9, reviewCount: 111, isActive: true, scheduleType: 'package', baseOffset: 16, seats: 6, bookedValues: [3, 4, 5], tripDays: 2,
  },
  {
    tourCode: '09042026016',
    name: 'นครนายกเล่นน้ำตก ขับ ATV และนั่งคาเฟ่สวน',
    description: 'ทริปวันเดียวใกล้กรุงเทพฯ ที่ได้ทั้งกิจกรรมและการพักผ่อน มีเวลาเล่นน้ำตกกับแวะคาเฟ่แบบพอดี',
    tourType: TourType.ONE_DAY,
    categories: ['กิจกรรม', 'ธรรมชาติ', 'ชิล'],
    price: 1590, childPrice: 1190, minPeople: null, maxPeople: null, originalPrice: 1890,
    imageKeyword: 'nakhon-nayok-waterfall',
    highlights: ['เล่นน้ำตกแบบปลอดภัย', 'มีกิจกรรม ATV สำหรับคนชอบความสนุก', 'เดินทางไม่ไกลจากกรุงเทพฯ'],
    itinerary: [
      { time: '09:30', title: 'ถึงนครนายกและแวะน้ำตก', description: 'ใช้เวลาริมน้ำตกพร้อมพักผ่อนและถ่ายรูปธรรมชาติ' },
      { time: '12:30', title: 'มื้อกลางวันแบบง่ายสบาย', description: 'ร้านท้องถิ่นรสกลาง ๆ กินได้ทั้งครอบครัว' },
      { time: '14:30', title: 'กิจกรรม ATV และคาเฟ่สวน', description: 'เลือกลงกิจกรรมหรือพักคาเฟ่ได้ตามสไตล์ของแต่ละคน' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคกลาง', province: 'นครนายก', accommodation: null,
    rating: 4.4, reviewCount: 133, isActive: true, scheduleType: 'one_day', baseOffset: 13, seats: 22, bookedValues: [12, 15, 14, 11],
  },
  {
    tourCode: '09042026017',
    name: 'พังงาเสม็ดนางชี ล่องเรืออ่าวพังงา และดินเนอร์ชมพระอาทิตย์ตก',
    description: 'เหมาะกับคนรักวิวทะเลแบบเงียบสงบ ได้ทั้งมุมสูง เส้นทางเรือ และมื้อเย็นบรรยากาศดี',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ถ่ายรูป', 'พักผ่อน'],
    price: 2590, childPrice: 1890, minPeople: null, maxPeople: null, originalPrice: 2990,
    imageKeyword: 'phang-nga',
    highlights: ['ขึ้นจุดชมวิวเสม็ดนางชี', 'ล่องเรืออ่าวพังงา', 'ดินเนอร์ชมพระอาทิตย์ตก'],
    itinerary: [
      { time: '08:00', title: 'ขึ้นจุดชมวิวตอนเช้า', description: 'แสงเช้าจะสวยมาก เห็นภูเขาหินปูนเรียงตัวกลางทะเล' },
      { time: '11:30', title: 'ล่องเรือชมอ่าวพังงา', description: 'แวะจุดถ่ายรูปและเรียนรู้เรื่องชุมชนประมงท้องถิ่น' },
      { time: '17:30', title: 'มื้อเย็นปิดท้ายวัน', description: 'จัดโต๊ะแบบเรียบง่ายริมวิว ให้บรรยากาศผ่อนคลาย' },
    ],
    transportation: 'รถตู้ + เรือท้องถิ่น', duration: '1 วัน', region: 'ภาคใต้', province: 'พังงา', accommodation: null,
    rating: 4.8, reviewCount: 117, isActive: true, scheduleType: 'one_day', baseOffset: 18, seats: 18, bookedValues: [8, 10, 12, 9],
  },
  {
    tourCode: '09042026018',
    name: 'อุบลราชธานี 2 วัน 1 คืน สามพันโบก วัดสวย และคาเฟ่ริมโขง',
    description: 'แพ็กเกจอีสานที่รวมแลนด์สเคปเด่นกับวัฒนธรรมท้องถิ่น เหมาะกับคนอยากลองเที่ยวเส้นทางใหม่ ๆ',
    tourType: TourType.PACKAGE,
    categories: ['ธรรมชาติ', 'วัฒนธรรม', 'พักผ่อน'],
    price: 4690, childPrice: 3590, minPeople: null, maxPeople: null, originalPrice: 5190,
    imageKeyword: 'ubon-ratchathani',
    highlights: ['ชมสามพันโบกช่วงแสงสวย', 'แวะวัดสวยในเมือง', 'พักโรงแรมกลางเมืองเดินทางสะดวก'],
    itinerary: [
      { day: 1, time: '10:30', title: 'เที่ยวในเมืองอุบลฯ', description: 'พาชมวัดเด่น คาเฟ่ และร้านอาหารพื้นถิ่นขึ้นชื่อ' },
      { day: 2, time: '06:30', title: 'เดินทางไปสามพันโบก', description: 'ไปช่วงเช้าเพื่อได้แสงสวยและอากาศไม่ร้อนเกินไป' },
      { day: 2, time: '12:00', title: 'มื้อเที่ยงก่อนเดินทางกลับ', description: 'ปิดท้ายด้วยอาหารอีสานรสกำลังดี' },
    ],
    transportation: 'รถตู้ VIP', duration: '2 วัน 1 คืน', region: 'ภาคตะวันออกเฉียงเหนือ', province: 'อุบลราชธานี',
    accommodation: 'โรงแรมกลางเมืองระดับ 4 ดาว พร้อมอาหารเช้า',
    rating: 4.6, reviewCount: 63, isActive: true, scheduleType: 'package', baseOffset: 19, seats: 16, bookedValues: [7, 9, 11], tripDays: 2,
  },
  {
    tourCode: '09042026019',
    name: 'ระยองสวนผลไม้ เกาะเสม็ด และมื้อเย็นริมหาด',
    description: 'รวมสองบรรยากาศในทริปเดียว ทั้งสวนผลไม้และทะเล เหมาะกับครอบครัวหรือกลุ่มเพื่อนที่อยากเที่ยวแบบไม่ซ้ำ',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ของกิน', 'ชิล'],
    price: 2090, childPrice: 1490, minPeople: null, maxPeople: null, originalPrice: 2390,
    imageKeyword: 'rayong-beach',
    highlights: ['แวะสวนผลไม้ตามฤดูกาล', 'ข้ามเรือไปเกาะเสม็ด', 'มีเวลาพักหาดช่วงบ่าย'],
    itinerary: [
      { time: '08:00', title: 'แวะสวนผลไม้ระยอง', description: 'เลือกชิมผลไม้ตามฤดูกาลและซื้อกลับได้' },
      { time: '11:30', title: 'ข้ามเรือไปเกาะเสม็ด', description: 'ลงหาดสวย เล่นน้ำ หรือเดินถ่ายรูปได้ตามชอบ' },
      { time: '17:30', title: 'มื้อเย็นริมหาด', description: 'กินง่าย ๆ ฟังเสียงคลื่นก่อนนั่งรถกลับ' },
    ],
    transportation: 'รถตู้ + เรือโดยสาร', duration: '1 วัน', region: 'ภาคตะวันออก', province: 'ระยอง', accommodation: null,
    rating: 4.5, reviewCount: 147, isActive: true, scheduleType: 'one_day', baseOffset: 17, seats: 24, bookedValues: [10, 13, 15, 12],
  },
  {
    tourCode: '09042026020',
    name: 'แพร่-ลำปาง 3 วัน 2 คืน เมืองเก่า บ้านไม้ และรถม้าช้า ๆ',
    description: 'ทริปสายเมืองเก่าที่เดินทางสบาย ได้ซึมซับเสน่ห์บ้านไม้ ร้านกาแฟเล็ก ๆ และวิถีเมืองเหนือแบบเรียบง่าย',
    tourType: TourType.PACKAGE,
    categories: ['วัฒนธรรม', 'ชิล', 'พักผ่อน'],
    price: 6490, childPrice: 5190, minPeople: 4, maxPeople: 10, originalPrice: 6990,
    imageKeyword: 'lampang-old-town',
    highlights: ['พักในย่านเมืองเก่าบรรยากาศดี', 'นั่งรถม้าลำปาง', 'แวะร้านกาแฟบ้านไม้ท้องถิ่น'],
    itinerary: [
      { day: 1, time: '11:00', title: 'เริ่มที่เมืองแพร่', description: 'ชมคุ้มเก่าและถนนที่ยังคงบรรยากาศสงบแบบเมืองเหนือ' },
      { day: 2, time: '09:00', title: 'เดินทางต่อสู่ลำปาง', description: 'แวะบ้านไม้เก่าและคาเฟ่ที่ตกแต่งเรียบแต่มีเสน่ห์' },
      { day: 3, time: '08:30', title: 'นั่งรถม้าก่อนกลับ', description: 'ปิดท้ายแบบค่อยเป็นค่อยไป ไม่เร่งรีบและถ่ายรูปสวยมาก' },
    ],
    transportation: 'รถตู้ส่วนตัว', duration: '3 วัน 2 คืน', region: 'ภาคเหนือ', province: 'ลำปาง',
    accommodation: 'ที่พักสไตล์บูทีคในย่านเมืองเก่า พร้อมอาหารเช้า',
    rating: 4.7, reviewCount: 58, isActive: true, scheduleType: 'package', baseOffset: 20, seats: 10, bookedValues: [5, 7, 8], tripDays: 3,
  },
  {
    tourCode: '09042026021',
    name: 'ชุมพรดำน้ำตื้น เกาะมาตรา และกินกาแฟริมทะเล',
    description: 'ทริปทะเลสำหรับคนอยากหนีคนเยอะ น้ำใส ดำน้ำง่าย และมีมุมพักผ่อนริมทะเลแบบไม่วุ่นวาย',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'กิจกรรม', 'พักผ่อน'],
    price: 2290, childPrice: 1690, minPeople: null, maxPeople: null, originalPrice: 2590,
    imageKeyword: 'chumphon-island',
    highlights: ['ดำน้ำตื้นน้ำใส', 'เกาะบรรยากาศสงบกว่าทะเลยอดนิยม', 'แวะร้านกาแฟเล็ก ๆ ริมหาด'],
    itinerary: [
      { time: '08:30', title: 'ลงเรือจากชุมพร', description: 'ออกเดินทางสู่เกาะแบบกลุ่มเล็ก บรรยากาศเป็นกันเอง' },
      { time: '11:00', title: 'ดำน้ำตื้น 2 จุด', description: 'เลือกจุดน้ำไม่ลึกมาก เหมาะกับมือใหม่และคนเล่นสบาย ๆ' },
      { time: '15:30', title: 'พักกาแฟริมทะเล', description: 'จบทริปด้วยมุมสงบ ๆ ก่อนส่งกลับที่พัก' },
    ],
    transportation: 'รถรับส่ง + เรือสปีดโบ๊ต', duration: '1 วัน', region: 'ภาคใต้', province: 'ชุมพร', accommodation: null,
    rating: 4.6, reviewCount: 89, isActive: true, scheduleType: 'one_day', baseOffset: 21, seats: 18, bookedValues: [7, 9, 10, 8],
  },
  {
    tourCode: '09042026022',
    name: 'สุโขทัยปั่นจักรยานชมอุทยาน และขนมไทยยามบ่าย',
    description: 'วันเดียวเที่ยวสุโขทัยแบบสบาย ๆ ได้ปั่นจักรยานชมเมืองเก่า และแวะร้านขนมไทยกับกาแฟช่วงบ่าย',
    tourType: TourType.ONE_DAY,
    categories: ['วัฒนธรรม', 'ชิล', 'ถ่ายรูป'],
    price: 1690, childPrice: 1190, minPeople: null, maxPeople: null, originalPrice: null,
    imageKeyword: 'sukhothai-historical-park',
    highlights: ['ปั่นจักรยานในอุทยานประวัติศาสตร์', 'ไกด์เล่าเรื่องแบบเข้าใจง่าย', 'มีขนมไทยและเครื่องดื่มช่วงบ่าย'],
    itinerary: [
      { time: '09:00', title: 'ปั่นจักรยานชมเมืองเก่า', description: 'เส้นทางราบ เดินทางง่าย และได้มุมถ่ายภาพสวยหลายจุด' },
      { time: '12:00', title: 'พักกลางวันเมนูท้องถิ่น', description: 'อาหารรสไม่จัดเกินไป กินง่ายและจัดเป็นชุด' },
      { time: '14:30', title: 'ขนมไทยยามบ่าย', description: 'แวะร้านเล็ก ๆ ที่คัดเมนูพื้นบ้านไว้ครบ' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคเหนือ', province: 'สุโขทัย', accommodation: null,
    rating: 4.5, reviewCount: 76, isActive: true, scheduleType: 'one_day', baseOffset: 22, seats: 18, bookedValues: [8, 9, 11, 10],
  },
  {
    tourCode: '09042026023',
    name: 'ตรัง 3 เกาะ ดำน้ำถ้ำมรกต และมื้อกลางวันริมเกาะ',
    description: 'ทะเลตรังที่เหมาะกับคนชอบน้ำใสและเกาะสงบ โปรแกรมจัดให้พอดีทั้งเล่นน้ำ ถ่ายรูป และพักผ่อน',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ดำน้ำ', 'ถ่ายรูป'],
    price: 2490, childPrice: 1890, minPeople: null, maxPeople: null, originalPrice: 2790,
    imageKeyword: 'trang-island',
    highlights: ['เข้าถ้ำมรกตพร้อมไกด์', 'แวะดำน้ำ 2 จุด', 'รวมมื้อกลางวันริมเกาะ'],
    itinerary: [
      { time: '08:00', title: 'เช็กอินท่าเรือและออกเดินทาง', description: 'เตรียมอุปกรณ์ดำน้ำและฟังคำแนะนำก่อนลงเรือ' },
      { time: '10:30', title: 'เข้าถ้ำมรกต', description: 'ช่วงเวลาที่เลือกจะช่วยให้คนไม่แน่นมากและเดินทางสะดวก' },
      { time: '13:00', title: 'พักมื้อกลางวันริมเกาะ', description: 'มีเวลานั่งพัก รับลมทะเล และเล่นน้ำต่อได้ตามสบาย' },
    ],
    transportation: 'รถรับส่ง + เรือสปีดโบ๊ต', duration: '1 วัน', region: 'ภาคใต้', province: 'ตรัง', accommodation: null,
    rating: 4.8, reviewCount: 131, isActive: true, scheduleType: 'one_day', baseOffset: 23, seats: 22, bookedValues: [9, 12, 14, 10],
  },
  {
    tourCode: '09042026024',
    name: 'ราชบุรีสวนผึ้ง 2 วัน 1 คืน ฟาร์ม คาเฟ่ และที่พักกลางเขา',
    description: 'ทริปสั้น ๆ ที่พาไปพักกลางเขาแบบอบอุ่น แวะฟาร์มและคาเฟ่ที่ถ่ายรูปสวย เหมาะกับคู่รักและกลุ่มเพื่อน',
    tourType: TourType.PACKAGE,
    categories: ['พักผ่อน', 'คาเฟ่', 'ถ่ายรูป'],
    price: 3990, childPrice: 2990, minPeople: null, maxPeople: null, originalPrice: 4390,
    imageKeyword: 'suan-phueng',
    highlights: ['พักรีสอร์ตกลางเขา 1 คืน', 'แวะฟาร์มและคาเฟ่สวย', 'บรรยากาศเงียบเหมาะกับการพักใจ'],
    itinerary: [
      { day: 1, time: '10:30', title: 'เริ่มเที่ยวโซนสวนผึ้ง', description: 'แวะคาเฟ่และฟาร์มแกะในเส้นทางเดียวกันแบบไม่เหนื่อย' },
      { day: 1, time: '16:00', title: 'เข้าที่พักและพักผ่อน', description: 'มีเวลาชมวิวพระอาทิตย์ตกจากที่พักได้เต็มที่' },
      { day: 2, time: '09:00', title: 'เก็บบรรยากาศก่อนกลับ', description: 'เดินเล่น ถ่ายรูป และแวะซื้อของฝากท้องถิ่น' },
    ],
    transportation: 'รถตู้ VIP', duration: '2 วัน 1 คืน', region: 'ภาคตะวันตก', province: 'ราชบุรี',
    accommodation: 'รีสอร์ตกลางเขาพร้อมอาหารเช้า',
    rating: 4.4, reviewCount: 95, isActive: true, scheduleType: 'package', baseOffset: 24, seats: 16, bookedValues: [8, 10, 11], tripDays: 2,
  },
  {
    tourCode: '09042026025',
    name: 'บุรีรัมย์สายสโลว์ ปราสาทหิน คาเฟ่ทุ่งนา และมื้อเย็นพื้นบ้าน',
    description: 'ทริปอีสานที่ไม่เร่งรีบ พาเที่ยวทั้งประวัติศาสตร์และมุมพักผ่อน เหมาะกับคนที่อยากลองเส้นทางใหม่',
    tourType: TourType.ONE_DAY,
    categories: ['วัฒนธรรม', 'ชิล', 'ของกิน'],
    price: 1790, childPrice: 1290, minPeople: null, maxPeople: null, originalPrice: 1990,
    imageKeyword: 'buriram',
    highlights: ['ชมปราสาทหินพนมรุ้ง', 'พักคาเฟ่ทุ่งนา', 'อาหารพื้นบ้านรสกลมกล่อม'],
    itinerary: [
      { time: '09:00', title: 'เที่ยวปราสาทหินพนมรุ้ง', description: 'เดินชมสถาปัตยกรรมเก่าแก่และฟังเรื่องเล่าที่เข้าใจง่าย' },
      { time: '12:30', title: 'พักคาเฟ่ทุ่งนา', description: 'นั่งพัก รับลม และถ่ายรูปมุมกว้างของทุ่งนา' },
      { time: '17:30', title: 'มื้อเย็นพื้นบ้าน', description: 'ปิดท้ายวันด้วยอาหารท้องถิ่นที่กินง่ายและรสไม่จัดเกินไป' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคตะวันออกเฉียงเหนือ', province: 'บุรีรัมย์', accommodation: null,
    rating: 4.5, reviewCount: 69, isActive: true, scheduleType: 'one_day', baseOffset: 25, seats: 18, bookedValues: [7, 9, 10, 8],
  },
  {
    tourCode: '09042026026',
    name: 'เชียงใหม่กรุ๊ปส่วนตัว 2 วัน 1 คืน ดอยสุเทพ คาเฟ่ และมื้อค่ำพื้นเมือง',
    description: 'ทริปส่วนตัวสำหรับกลุ่มเล็กที่อยากเที่ยวเชียงใหม่แบบยืดหยุ่น มีเวลาปรับจังหวะได้ตามความชอบของกลุ่ม',
    tourType: TourType.PACKAGE,
    categories: ['ส่วนตัว', 'คาเฟ่', 'พักผ่อน'],
    price: 6990, childPrice: 5490, minPeople: 4, maxPeople: 8, originalPrice: 7590,
    imageKeyword: 'chiang-mai-private-tour',
    highlights: ['รถและไกด์ดูแลเฉพาะกลุ่ม', 'ปรับเวลาแวะได้ในกรอบโปรแกรม', 'เหมาะกับครอบครัวหรือกลุ่มเพื่อน'],
    itinerary: [
      { day: 1, time: '10:00', title: 'เริ่มเที่ยวในเมืองแบบสบาย ๆ', description: 'แวะดอยสุเทพและคาเฟ่ตามสไตล์ของกลุ่มโดยไม่ต้องรีบตามกรุ๊ปใหญ่' },
      { day: 1, time: '18:00', title: 'มื้อค่ำพื้นเมือง', description: 'เลือกเมนูที่กินง่ายและบรรยากาศอบอุ่นสำหรับกลุ่มเล็ก' },
      { day: 2, time: '09:30', title: 'เก็บคาเฟ่และของฝากก่อนกลับ', description: 'มีเวลาช้อปเบา ๆ ก่อนส่งสนามบินหรือสถานี' },
    ],
    transportation: 'รถตู้ส่วนตัวพร้อมคนขับ', duration: '2 วัน 1 คืน', region: 'ภาคเหนือ', province: 'เชียงใหม่',
    accommodation: 'โรงแรมใจกลางเมืองระดับ 4 ดาว พร้อมอาหารเช้า',
    rating: 4.9, reviewCount: 54, isActive: true, scheduleType: 'package', baseOffset: 26, seats: 8, bookedValues: [4, 5, 6], tripDays: 2,
  },
  {
    tourCode: '09042026027',
    name: 'สมุยวันสบาย หาดสวย วัดพระใหญ่ และคาเฟ่ริมทะเล',
    description: 'เที่ยวสมุยแบบคัดจุดมาแล้วสำหรับคนอยากพักผ่อน ได้ทั้งแลนด์มาร์ก มุมถ่ายรูป และเวลาชิลริมทะเล',
    tourType: TourType.ONE_DAY,
    categories: ['ทะเล', 'ชิล', 'ถ่ายรูป'],
    price: 2590, childPrice: 1890, minPeople: null, maxPeople: null, originalPrice: 2890,
    imageKeyword: 'samui-beach',
    highlights: ['แวะวัดพระใหญ่และหาดชื่อดัง', 'มีเวลานั่งคาเฟ่ริมทะเล', 'โปรแกรมเที่ยวสบายไม่เร่งเกินไป'],
    itinerary: [
      { time: '09:00', title: 'เริ่มต้นที่วัดพระใหญ่', description: 'ไหว้พระและชมวิวทะเลจากมุมสูงก่อนออกเที่ยวชายหาด' },
      { time: '12:00', title: 'พักคาเฟ่ริมทะเล', description: 'มีเวลานั่งชิลและถ่ายรูปโทนซัมเมอร์แบบเต็มที่' },
      { time: '15:30', title: 'เล่นน้ำหรือเดินหาดตามอัธยาศัย', description: 'ปิดท้ายวันด้วยช่วงเวลาสบาย ๆ ก่อนกลับที่พัก' },
    ],
    transportation: 'รถตู้บนเกาะ', duration: '1 วัน', region: 'ภาคใต้', province: 'สุราษฎร์ธานี', accommodation: null,
    rating: 4.7, reviewCount: 140, isActive: true, scheduleType: 'one_day', baseOffset: 27, seats: 20, bookedValues: [10, 12, 14, 11],
  },
  {
    tourCode: '09042026028',
    name: 'ปาย 3 วัน 2 คืน หมอกเช้า สะพานไม้ และคาเฟ่กลางหุบเขา',
    description: 'ทริปปายสำหรับคนอยากพักจริง ๆ โปรแกรมไม่อัดแน่น มีเวลานั่งดูวิว เดินตลาด และตื่นเช้าชมหมอกแบบช้า ๆ',
    tourType: TourType.PACKAGE,
    categories: ['ภูเขา', 'พักผ่อน', 'คาเฟ่'],
    price: 7290, childPrice: 5890, minPeople: null, maxPeople: null, originalPrice: 7890,
    imageKeyword: 'pai-thailand',
    highlights: ['พักรีสอร์ตวิวเขา 2 คืน', 'ตารางเที่ยวไม่แน่นเกินไป', 'เหมาะกับคนอยากพักสายตาและใจ'],
    itinerary: [
      { day: 1, time: '13:00', title: 'ถึงปายและพักผ่อนในที่พัก', description: 'เริ่มต้นแบบช้า ๆ ด้วยการแวะคาเฟ่และเช็กอินเข้าที่พัก' },
      { day: 2, time: '06:00', title: 'ชมหมอกยามเช้า', description: 'ออกไปจุดชมวิวช่วงเช้าแล้วกลับมาทานอาหารแบบสบาย ๆ' },
      { day: 3, time: '10:00', title: 'เดินตลาดและซื้อของฝาก', description: 'เก็บบรรยากาศเมืองเล็กก่อนเดินทางกลับเชียงใหม่' },
    ],
    transportation: 'รถตู้ VIP', duration: '3 วัน 2 คืน', region: 'ภาคเหนือ', province: 'แม่ฮ่องสอน',
    accommodation: 'รีสอร์ตวิวเขาพร้อมอาหารเช้า 2 มื้อ',
    rating: 4.8, reviewCount: 102, isActive: true, scheduleType: 'package', baseOffset: 28, seats: 14, bookedValues: [8, 10, 12], tripDays: 3,
  },
  {
    tourCode: '09042026029',
    name: 'สุพรรณบุรีทุ่งดอกไม้ ตลาดเก่า และร้านอาหารบ้านสวน',
    description: 'ทริปวันเดียวสำหรับคนอยากเปลี่ยนบรรยากาศใกล้เมือง เดินตลาดเก่า แวะทุ่งดอกไม้ และกินมื้ออร่อยแบบบ้าน ๆ',
    tourType: TourType.ONE_DAY,
    categories: ['ถ่ายรูป', 'ชิล', 'ของกิน'],
    price: 1490, childPrice: 990, minPeople: null, maxPeople: null, originalPrice: null,
    imageKeyword: 'suphan-buri',
    highlights: ['เดินตลาดเก่าร้อยปี', 'แวะทุ่งดอกไม้ตามฤดูกาล', 'กินอาหารบ้านสวนบรรยากาศดี'],
    itinerary: [
      { time: '09:30', title: 'เดินตลาดเก่า', description: 'ชิมของกินพื้นบ้านและดูวิถีชุมชนที่ยังคงความเรียบง่าย' },
      { time: '12:00', title: 'มื้อกลางวันบ้านสวน', description: 'อาหารไทยรสพอดี กินง่ายและเสิร์ฟเป็นชุด' },
      { time: '14:30', title: 'ถ่ายรูปทุ่งดอกไม้', description: 'เลือกแวะจุดที่กำลังสวยตามฤดูกาลเพื่อให้ได้บรรยากาศดีที่สุด' },
    ],
    transportation: 'รถตู้ปรับอากาศ', duration: '1 วัน', region: 'ภาคกลาง', province: 'สุพรรณบุรี', accommodation: null,
    rating: 4.3, reviewCount: 82, isActive: true, scheduleType: 'one_day', baseOffset: 29, seats: 18, bookedValues: [8, 10, 9, 7],
  },
  {
    tourCode: '09042026030',
    name: 'เขาใหญ่กรุ๊ปส่วนตัว 2 วัน 1 คืน ไวน์ คาเฟ่ และที่พักวิวเขา',
    description: 'แพ็กเกจส่วนตัวสำหรับกลุ่มเล็กที่อยากพักเขาใหญ่แบบดูดีแต่ไม่ทางการเกินไป มีทั้งคาเฟ่ ไร่องุ่น และเวลาพักจริง',
    tourType: TourType.PACKAGE,
    categories: ['ส่วนตัว', 'พักผ่อน', 'คาเฟ่'],
    price: 6590, childPrice: 5190, minPeople: 4, maxPeople: 10, originalPrice: 7190,
    imageKeyword: 'khao-yai',
    highlights: ['ทริปส่วนตัวสำหรับกลุ่มเล็ก', 'แวะไร่องุ่นและคาเฟ่ดัง', 'พักโรงแรมวิวเขา 1 คืน'],
    itinerary: [
      { day: 1, time: '10:30', title: 'เดินทางถึงเขาใหญ่และเริ่มเที่ยว', description: 'แวะคาเฟ่และไร่องุ่นในจังหวะที่สบาย ไม่ต้องเร่งตามกรุ๊ปใหญ่' },
      { day: 1, time: '16:00', title: 'เข้าที่พักวิวเขา', description: 'มีเวลาพักผ่อนและชมบรรยากาศเย็น ๆ ช่วงพระอาทิตย์ตก' },
      { day: 2, time: '09:00', title: 'แวะจุดชมวิวก่อนกลับ', description: 'เก็บรูปและของฝากเล็ก ๆ ก่อนเดินทางกลับกรุงเทพฯ' },
    ],
    transportation: 'รถตู้ส่วนตัวพร้อมคนขับ', duration: '2 วัน 1 คืน', region: 'ภาคกลาง', province: 'นครราชสีมา',
    accommodation: 'โรงแรมวิวเขาระดับ 4 ดาว พร้อมอาหารเช้า',
    rating: 4.8, reviewCount: 91, isActive: true, scheduleType: 'package', baseOffset: 30, seats: 10, bookedValues: [5, 6, 8], tripDays: 2,
  },
];
export const DASHBOARD_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.SUCCESS,
  BookingStatus.SUCCESS,
  BookingStatus.AWAITING_APPROVAL,
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.SUCCESS,
  BookingStatus.CANCELED,
  BookingStatus.REFUND_PENDING,
  BookingStatus.SUCCESS,
];

export const dashboardToursSeed: TourSeed[] = tourConfigs.map(({ imageKeyword, scheduleType, baseOffset, seats, bookedValues, tripDays, ...tour }) => ({
  ...tour,
  images: createImageSet(imageKeyword),
  schedules: buildSchedules({ scheduleType, baseOffset, seats, bookedValues, tripDays }),
}));

// ─── Thai-language review comments ───────────────────────────────────────────
export const THAI_REVIEW_COMMENTS: { rating: number; comment: string }[] = [
  { rating: 5, comment: 'ทริปนี้สนุกมากเลยค่ะ ไกด์พี่เก่งและอธิบายดีมาก อาหารอร่อย วิวสวยงามมาก ประทับใจมากจนอยากกลับไปอีก' },
  { rating: 5, comment: 'บรรยากาศดีมาก จัดโปรแกรมพอดี ไม่เร่งจนเกินไป ได้พักผ่อนจริง ๆ ราคาคุ้มค่าคุ้มราคามาก' },
  { rating: 5, comment: 'ประทับใจมากเลยครับ รถสะอาด ตรงเวลา ไกด์ดูแลดีมาก อาหารครบทุกมื้อ วิวสวยมาก แนะนำเลย' },
  { rating: 5, comment: 'เยี่ยมมากค่ะ วางแผนทริปมาดีมาก ไม่แน่นจนเหนื่อย มีเวลาถ่ายรูปเพียงพอ ของกินอร่อยทุกจุด' },
  { rating: 5, comment: 'คุ้มค่ามากครับ ที่พักสวย บรรยากาศดี ไกด์เป็นกันเอง ดูแลทุกคนดีมาก จะกลับมาจองซ้ำแน่นอน' },
  { rating: 4, comment: 'ทริปดีมากครับ สนุกดี แต่เวลาน้อยไปหน่อยที่แต่ละจุด ถ้ามีเวลามากกว่านี้จะดีมาก โดยรวมพอใจมาก' },
  { rating: 4, comment: 'ชอบมากเลยค่ะ ไกด์น่ารักมาก อธิบายละเอียด อาหารอร่อย แต่รถค่อนข้างอัดแน่นนิดหน่อย' },
  { rating: 4, comment: 'ทริปดีค่ะ คุ้มค่าดี บรรยากาศสวย แต่อยากให้มีเวลาพักผ่อนช่วงบ่ายมากกว่านี้ โดยรวมโอเคมาก' },
  { rating: 4, comment: 'สนุกดีครับ ไกด์เป็นกันเอง ทริปไม่เหนื่อยมาก มีกิจกรรมพอดี อาหารกลางวันดีมาก จะมาอีกครั้ง' },
  { rating: 4, comment: 'ดีมากค่ะ วิวสวยงาม ไกด์ดูแลดี อาหารอร่อย แต่ต้องการจุดจอดรถที่ดีกว่านี้ โดยรวมพอใจ' },
  { rating: 5, comment: 'วิวสวยมากครับ ไม่ผิดหวังเลย ไกด์พาเที่ยวครบทุกจุดสำคัญ มีเวลาถ่ายรูปและพักผ่อนพอดี ๆ' },
  { rating: 5, comment: 'ชอบมากค่ะ ที่พักสะอาดมาก อาหารเช้าอร่อย วิวจากห้องสวยงาม ไกด์ดูแลดีตลอดทริป' },
  { rating: 3, comment: 'ทริปพอใช้ได้ครับ แต่คิดว่าราคาแพงไปนิดหน่อยสำหรับสิ่งที่ได้ อาหารกลางวันไม่ค่อยถูกปาก' },
  { rating: 5, comment: 'ดีเยี่ยมมากค่ะ ทุกอย่างเป็นไปตามที่ระบุไว้ ไกด์ตรงเวลา รถสะอาด อาหารอร่อย วิวสวยมาก ประทับใจสุด ๆ' },
  { rating: 4, comment: 'ทริปดีมากครับ ราคาคุ้มค่า ไกด์เป็นมืออาชีพ อยากให้มีตัวเลือกอาหารมากกว่านี้ แต่โดยรวมชอบ' },
  { rating: 5, comment: 'สุดยอดมากค่ะ ครั้งแรกที่มาแต่ไม่รู้สึกแปลกเลย ไกด์ดูแลดีมาก ทริปสนุกตลอด จะกลับมาจองซ้ำ' },
  { rating: 4, comment: 'ดีมากครับ แต่อยากให้จุดนัดพบชัดเจนกว่านี้ เพราะหาที่จอดรถยากนิดหน่อย โดยรวมพอใจมาก' },
  { rating: 5, comment: 'ประทับใจมากค่ะ ทัวร์คุ้มค่าคุ้มราคา ไกด์น่ารัก บรรยากาศดี อาหารครบ จะแนะนำเพื่อน ๆ แน่นอน' },
  { rating: 5, comment: 'เที่ยวดีมากครับ ได้รูปสวยมาก ไกด์พาไปจุดที่ไม่รู้จัก วิวสวยมาก อาหารอร่อย ทริปน่าจดจำมาก' },
  { rating: 3, comment: 'ทริปโอเคค่ะ แต่อากาศร้อนมากช่วงกลางวัน อยากให้มีร่มหรือพัดลมมากกว่านี้ที่จุดพักผ่อน' },
  { rating: 4, comment: 'ชอบมากครับ ทริปไม่เหนื่อย ได้เที่ยวครบ ไกด์อธิบายประวัติศาสตร์ได้ดีมาก อาหารอร่อย คุ้มค่า' },
  { rating: 5, comment: 'ดีมากเลยค่ะ สนุกสุด ๆ ไกด์เฮฮาและเป็นกันเองมาก ทริปสนุกตลอด ไม่มีช่วงน่าเบื่อเลย แนะนำ' },
  { rating: 4, comment: 'ทริปดีครับ วิวสวย อากาศดี ไกด์ดูแลดี อยากให้เพิ่มเวลาที่จุดถ่ายรูปมากกว่านี้อีกนิด' },
  { rating: 5, comment: 'สุดยอดมากค่ะ ไม่ผิดหวังเลยจากรีวิว ทริปดีกว่าที่คาดไว้ด้วยซ้ำ จะกลับมาจองทริปอื่นแน่นอน' },
  { rating: 4, comment: 'ดีมากครับ ที่พักสะอาด อาหารอร่อย ไกด์ดูแลดี แต่อยากให้โปรแกรมยืดหยุ่นกว่านี้สักนิด' },
  { rating: 5, comment: 'ประทับใจมากค่ะ ทริปน่าจดจำมาก ไกด์ดูแลทุกอย่างครบถ้วน ไม่ต้องกังวลอะไรเลย สนุกมาก' },
  { rating: 5, comment: 'ดีมากเลยครับ ทริปครบทุกอย่างตามที่บอก อาหารอร่อย วิวสวย ไกด์เป็นกันเอง คุ้มค่ามาก' },
  { rating: 4, comment: 'ทริปดีค่ะ ได้เที่ยวครบ แต่บางจุดผู้คนเยอะมาก คงเป็นช่วงไฮซีซัน โดยรวมยังพอใจ' },
  { rating: 5, comment: 'เยี่ยมมากครับ ทริปสนุก ไกด์ดีมาก อาหารอร่อย ที่พักสวยมาก คุ้มค่าทุกบาทเลย' },
  { rating: 5, comment: 'สุดยอดค่ะ ทุกอย่างลงตัวมาก ทริปสนุก ได้รูปสวย วิวสวยงาม ไกด์ดูแลดีมาก จะกลับมาอีก' },
];

// ─── Enriched customer data pool ─────────────────────────────────────────────
export const ENRICHED_CUSTOMERS: {
  name: string;
  email: string;
  phone: string;
  prefix: 'นาย' | 'นาง' | 'นางสาว';
}[] = [
  { name: 'สมชาย ใจดี', email: 'somchai@test.com', phone: '0811111111', prefix: 'นาย' },
  { name: 'สมหญิง จริงใจ', email: 'somying@test.com', phone: '0822222222', prefix: 'นางสาว' },
  { name: 'วิชัย มีสุข', email: 'wichai@test.com', phone: '0833333333', prefix: 'นาย' },
  { name: 'นภา สวัสดิ์', email: 'napa@test.com', phone: '0844444444', prefix: 'นางสาว' },
  { name: 'ธนา พัฒนา', email: 'tana@test.com', phone: '0855555555', prefix: 'นาย' },
  { name: 'มณี รักษ์', email: 'manee@test.com', phone: '0866666666', prefix: 'นาง' },
  { name: 'ประเสริฐ ศรีสุข', email: 'prasert@test.com', phone: '0877777777', prefix: 'นาย' },
  { name: 'กัญญา ดี', email: 'kanya@test.com', phone: '0888888888', prefix: 'นางสาว' },
];

// ─── Thai traveler names pool ─────────────────────────────────────────────────
export const THAI_TRAVELER_NAMES: string[] = [
  'สมชาย ใจดี', 'สมหญิง จริงใจ', 'วิชัย มีสุข', 'นภา สวัสดิ์',
  'ธนา พัฒนา', 'มณี รักษ์', 'ประเสริฐ ศรีสุข', 'กัญญา ดี',
  'อรุณ แสงสว่าง', 'มาลี ดอกไม้', 'สุรชัย วงศ์ทอง', 'ปิยะ ดีงาม',
  'ลักษณา สุดสวย', 'ชัชวาล บุญมา', 'พิมพ์ใจ เรืองรอง', 'ศุภชัย จันทร์เพ็ญ',
  'กนกวรรณ ทองดี', 'ณัฐพล แก้วมณี', 'วรรณา สุขสันต์', 'เอกชัย ปัญญาดี',
];

// ─── Special request pool ─────────────────────────────────────────────────────
export const SPECIAL_REQUESTS: (string | null)[] = [
  'ต้องการอาหารมังสวิรัติ',
  'ต้องการอาหารฮาลาล',
  'มีผู้สูงอายุร่วมเดินทาง ขอรถเข้าใกล้จุดขึ้นลง',
  'มีเด็กเล็กอายุ 3 ขวบ ขอที่นั่งพิเศษในรถ',
  'แพ้อาหารทะเล กรุณาแจ้งร้านอาหาร',
  'ต้องการห้องพักชั้นล่าง (สำหรับทริปค้างคืน)',
  null, null, null, null, // ส่วนมากไม่มี special request
];

// ─── Admin notes pool ─────────────────────────────────────────────────────────
export const ADMIN_NOTES_POOL: string[] = [
  'ลูกค้า VIP ดูแลเป็นพิเศษ',
  'ตรวจสลิปแล้ว ยืนยันการชำระเงินเรียบร้อย',
  'ลูกค้าโทรยืนยันการจองแล้ว',
  'ส่ง SMS ยืนยันแล้ว',
  'ตรวจสอบข้อมูลผู้เดินทางครบถ้วน',
  'ลูกค้ามากับกลุ่มเพื่อน ดูแลเพิ่มเติม',
];

// ─── Notification templates ───────────────────────────────────────────────────
export type NotificationSeedItem = {
  type: 'booking_confirmed' | 'booking_success' | 'booking_canceled' | 'new_booking' | 'payment_uploaded';
  title: string;
  message: (tourName: string, bookingId: number, customerName?: string) => string;
};

export const NOTIFICATION_TEMPLATES: NotificationSeedItem[] = [
  {
    type: 'booking_confirmed',
    title: 'การจองได้รับการยืนยัน ✅',
    message: (tourName, bookingId) =>
      `การจอง #${bookingId} ทริป "${tourName}" ได้รับการยืนยันจากทีมงานเรียบร้อยแล้ว กรุณาเตรียมตัวให้พร้อมก่อนวันเดินทาง`,
  },
  {
    type: 'booking_success',
    title: 'ทริปของคุณเสร็จสิ้นแล้ว 🎉',
    message: (tourName, bookingId) =>
      `ขอบคุณที่ใช้บริการ! ทริป "${tourName}" (การจอง #${bookingId}) เสร็จสิ้นแล้ว หากคุณพอใจ รบกวนฝากรีวิวให้เราด้วยนะคะ`,
  },
  {
    type: 'booking_canceled',
    title: 'การจองถูกยกเลิก ❌',
    message: (tourName, bookingId) =>
      `การจอง #${bookingId} ทริป "${tourName}" ถูกยกเลิกแล้ว หากมีข้อสงสัยกรุณาติดต่อทีมงาน`,
  },
  {
    type: 'new_booking',
    title: 'มีการจองใหม่เข้ามา 📋',
    message: (tourName, bookingId, customerName) =>
      `ลูกค้า ${customerName ?? 'ไม่ระบุ'} ได้ทำการจองทริป "${tourName}" (การจอง #${bookingId}) กรุณาตรวจสอบและยืนยันการจอง`,
  },
  {
    type: 'payment_uploaded',
    title: 'ลูกค้าอัปโหลดหลักฐานการชำระเงิน 💳',
    message: (tourName, bookingId, customerName) =>
      `ลูกค้า ${customerName ?? 'ไม่ระบุ'} อัปโหลดหลักฐานการชำระเงินสำหรับทริป "${tourName}" (การจอง #${bookingId}) กรุณาตรวจสอบและอนุมัติ`,
  },
];

// ─── Behavior event types ────────────────────────────────────────────────────
export const BEHAVIOR_EVENT_TYPES = [
  { type: 'page_view', paths: ['/', '/tours', '/tours/1', '/tours/2', '/tours/3'] },
  { type: 'tour_click', paths: ['/tours'] },
  { type: 'booking_start', paths: ['/tours/1', '/tours/2', '/tours/3'] },
  { type: 'search', paths: ['/tours'] },
  { type: 'filter_change', paths: ['/tours'] },
  { type: 'scroll_depth', paths: ['/tours/1', '/'] },
];

