"""Собирает Excel-таблицу по регуляторной политике из data/regulation.json.

Запуск: python scripts/regulation/build_xlsx.py [путь_к_xlsx]
По умолчанию пишет public/lab/regulation.xlsx (закрыт паролем вместе с /lab).
"""
import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'data' / 'regulation.json').read_text(encoding='utf-8'))
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public' / 'lab' / 'regulation.xlsx'

BLOC = {'EU': 'ЕС', 'EAEU': 'ЕАЭС', 'other': 'Вне ЕС и ЕАЭС'}
USE = {'high': 'Высокая', 'medium': 'Средняя', 'low': 'Низкая', 'none': 'Нет', 'nodata': 'Нет данных'}
TYPE = {
    'disclosure': 'Раскрытие в составе / маркировка',
    'claims': 'Правила заявок',
    'ban': 'Запрет / ограничение состава',
    'dairy': 'Молочка и заменители молочного жира',
    'import': 'Импортный контроль',
    'traceability': 'Цифровая маркировка и прослеживаемость',
    'tax': 'Налоги',
    'standard': 'Стандарты качества',
    'sustainability': 'Устойчивость (EUDR)',
}
STATUS = {'in_force': 'Действует', 'upcoming': 'Принято, вступает позже', 'proposal': 'Предложение / проект'}
SCOPE_NAME = {'EU': 'ЕС (общие нормы)', 'EAEU': 'ЕАЭС (общие нормы)'}
SCOPE_NAME.update({c['code']: c['name']['ru'] for c in DATA['countries']})

FONT = 'Arial'
HEAD_FILL = PatternFill('solid', fgColor='17241F')
HEAD_FONT = Font(name=FONT, bold=True, color='FFFFFF', size=10)
BODY = Font(name=FONT, size=10)
BOLD = Font(name=FONT, size=10, bold=True)
LINK = Font(name=FONT, size=10, color='0563C1', underline='single')
THIN = Side(style='thin', color='D9DFD6')
GRID = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)
WRAP = Alignment(wrap_text=True, vertical='top')
STATUS_FILL = {
    'Действует': PatternFill('solid', fgColor='E5F4E4'),
    'Принято, вступает позже': PatternFill('solid', fgColor='F9EEDA'),
    'Предложение / проект': PatternFill('solid', fgColor='F0EFEC'),
}


def fmt_date(d: str) -> str:
    """ISO-дата → ДД.ММ.ГГГГ; «2025-11» → 11.2025; «2025» → 2025; пусто → «—»."""
    if not d:
        return '—'
    p = d.split('-')
    return '.'.join(reversed(p))


def header(ws, cols):
    for i, (title, width) in enumerate(cols, 1):
        c = ws.cell(row=1, column=i, value=title)
        c.font, c.fill, c.alignment, c.border = HEAD_FONT, HEAD_FILL, Alignment(wrap_text=True, vertical='center'), GRID
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = 'C2'


def body(cell, font=BODY):
    cell.font, cell.alignment, cell.border = font, WRAP, GRID


wb = Workbook()

# ---------- Лист «Меры»: одна строка — одна норма ----------
ms = wb.active
ms.title = 'Меры'
header(ms, [
    ('№', 5), ('Код охвата', 9), ('Охват', 20), ('Тип меры', 24), ('Статус', 17), ('Дата вступления', 13),
    ('Правовой акт / источник нормы', 34), ('Мера', 34), ('Описание', 60),
    ('Measure (EN)', 34), ('Description (EN)', 60), ('Ссылка', 40),
])
for r, m in enumerate(DATA['measures'], 2):
    vals = [r - 1, m['scope'], SCOPE_NAME[m['scope']], TYPE[m['type']], STATUS[m['status']], fmt_date(m['date']),
            m['act']['ru'], m['title']['ru'], m['text']['ru'], m['title']['en'], m['text']['en'], m['url'] or '—']
    for col, v in enumerate(vals, 1):
        c = ms.cell(row=r, column=col, value=v)
        body(c, BOLD if col == 8 else BODY)
    ms.cell(row=r, column=5).fill = STATUS_FILL[STATUS[m['status']]]
    if m['url']:
        link = ms.cell(row=r, column=12)
        link.hyperlink, link.font = m['url'], LINK
last_m = len(DATA['measures']) + 1
ms.auto_filter.ref = f'A1:L{last_m}'

# ---------- Лист «Сводка по странам» ----------
ss = wb.create_sheet('Сводка по странам', 0)
header(ss, [
    ('№', 5), ('Страна', 16), ('Блок', 14), ('Формулировка на упаковке', 26), ('Использование заявки «без пальмового масла»', 16),
    ('Норм всего (вкл. блок)', 11), ('Действуют', 11), ('Вступают позже', 11), ('Предложения', 11),
    ('Регулирование кратко', 52), ('Рыночная практика заявки', 60), ('Код', 7), ('Код блока', 8),
])
M = "'Меры'"
for r, c in enumerate(DATA['countries'], 2):
    bloc_code = c['bloc'] if c['bloc'] in ('EU', 'EAEU') else '-'
    vals = [r - 1, c['name']['ru'], BLOC[c['bloc']], c['claimPhrase'], USE[c['claimUse']]]
    for col, v in enumerate(vals, 1):
        body(ss.cell(row=r, column=col, value=v), BOLD if col == 2 else BODY)
    # Счётчики норм — формулами по листу «Меры»: свои нормы страны + общие нормы её блока.
    rng_code = f'{M}!$B$2:$B${last_m}'
    rng_status = f'{M}!$E$2:$E${last_m}'
    ss.cell(row=r, column=6, value=f'=COUNTIF({rng_code},L{r})+COUNTIF({rng_code},M{r})')
    for col, st in ((7, 'Действует'), (8, 'Принято, вступает позже'), (9, 'Предложение / проект')):
        ss.cell(row=r, column=col, value=f'=COUNTIFS({rng_code},L{r},{rng_status},"{st}")+COUNTIFS({rng_code},M{r},{rng_status},"{st}")')
    for col in range(6, 10):
        cell = ss.cell(row=r, column=col)
        body(cell)
        cell.alignment = Alignment(horizontal='center', vertical='top')
    body(ss.cell(row=r, column=10, value=c['summary']['ru']))
    body(ss.cell(row=r, column=11, value=c['practice']['ru']))
    body(ss.cell(row=r, column=12, value=c['code']))
    body(ss.cell(row=r, column=13, value=bloc_code))
last_c = len(DATA['countries']) + 1
ss.auto_filter.ref = f'A1:M{last_c}'
dv = DataValidation(type='list', formula1='"' + ','.join(USE.values()) + '"', allow_blank=True)
ss.add_data_validation(dv)
dv.add(f'E2:E{last_c}')
tot = last_c + 2
ss.cell(row=tot, column=2, value='Итого норм в базе').font = BOLD
ss.cell(row=tot, column=6, value=f'=COUNTA({M}!$A$2:$A${last_m})').font = BOLD
for col, st in ((7, 'Действует'), (8, 'Принято, вступает позже'), (9, 'Предложение / проект')):
    ss.cell(row=tot, column=col, value=f'=COUNTIF({M}!$E$2:$E${last_m},"{st}")').font = BOLD
ss.cell(row=tot + 1, column=2,
        value='Столбцы F–I считаются формулами по листу «Меры»: нормы страны + общие нормы её блока (ЕС или ЕАЭС). '
              'Столбец E — экспертная оценка по публикациям, выбирается из списка.').font = Font(name=FONT, size=9, italic=True)

# ---------- Лист «Справочник» ----------
gs = wb.create_sheet('Справочник')
gs.column_dimensions['A'].width = 30
gs.column_dimensions['B'].width = 90
rows = [
    ('Регуляторная политика: маркировки и пальмовое масло', ''),
    ('Подготовлено', 'International Marketing Agency (IMA)'),
    ('Данные на', fmt_date(DATA['updatedAt'])),
    ('Период обзора', DATA['period']['ru']),
    ('', ''),
    ('Статусы', ''),
    *[(v, '') for v in STATUS.values()],
    ('', ''),
    ('Типы мер', ''),
    *[(v, '') for v in TYPE.values()],
    ('', ''),
    ('Шкала использования заявки', 'Экспертная оценка по найденным публикациям: Высокая / Средняя / Низкая / Нет / Нет данных.'),
    ('Ограничения', 'Источники — открытый веб на национальных языках. Аудит полок и платные базы (Mintel GNPD, Euromonitor) не использовались. '
                    'Даты без дня указаны с точностью до месяца или года; «—» — дата не установлена.'),
    ('Оговорка', 'Справочный материал, не юридическая консультация. Перед решениями проверяйте текст нормы по ссылке.'),
]
for r, (a, b) in enumerate(rows, 1):
    ca, cb = gs.cell(row=r, column=1, value=a), gs.cell(row=r, column=2, value=b)
    ca.font = Font(name=FONT, size=13, bold=True) if r == 1 else (BOLD if a in ('Статусы', 'Типы мер') or b else BODY)
    cb.font, cb.alignment = BODY, WRAP
for v, fill in STATUS_FILL.items():
    for r in range(1, len(rows) + 1):
        if gs.cell(row=r, column=1).value == v:
            gs.cell(row=r, column=1).fill = fill

OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print(OUT)
