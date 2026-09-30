export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная", description: "Сводка по магазину" },
  { href: "/products", label: "Товары", description: "Каталог и карточки товаров" },
  { href: "/prices", label: "Цены", description: "Цены, скидки и наценка" },
  { href: "/fbo", label: "FBO", description: "Поставки и остатки на складах" },
  { href: "/analytics", label: "Аналитика", description: "Показы, конверсия, заказы" },
  { href: "/customers", label: "Покупатели", description: "Отзывы, вопросы и чаты" },
  { href: "/promotion", label: "Продвижение", description: "Акции и рекламные кампании" },
  { href: "/finance", label: "Финансы", description: "Транзакции и выплаты" },
];
