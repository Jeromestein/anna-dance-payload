"""Run only against the disposable PostgreSQL used by course-package-sales-database.sql."""
import concurrent.futures
import subprocess
import sys
import uuid

socket, port, database = sys.argv[1:]
if not socket.startswith('/tmp/anna-package-pg.') or not database.startswith('package_test'):
    raise SystemExit('Only the disposable package test database is supported.')

psql = ['/opt/homebrew/opt/postgresql@15/bin/psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', port, '-d', database]
def query(sql):
    return subprocess.check_output(psql + ['-c', sql], text=True).strip()

catalog = 'concurrency-' + uuid.uuid4().hex
owner = '00000000-0000-4000-8000-000000000002'
def purchase(_):
    return query(f"""select public.app_purchase_package('{owner}','{uuid.uuid4()}','student','DUET-01','{catalog}',
    '{{"id":"DUET-01"}}', '{{"course_key":"duet","description":"Duet Monday 16:00–17:00","credit_count":10,
    "lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}}',75000,true);""")
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    bills = list(pool.map(purchase, range(12)))
assert len(set(bills)) == 1, bills
assert query(f"select count(*) from public.app_payment_items where payment_id='{bills[0]}'") == '1'
# Race two payment choices: either cash blocks reservation, or reservation blocks cash.
def cash():
    return query(f"select public.app_package_payment_method('{owner}','{bills[0]}',true)")
def online():
    return query(f"select public.app_stripe_bill('reserve_checkout','{owner}','{bills[0]}','{{\"account\":\"acct_course\",\"livemode\":true}}')")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    pending = [pool.submit(cash), pool.submit(online)]
    successes = 0
    for future in pending:
        try:
            future.result()
            successes += 1
        except subprocess.CalledProcessError:
            pass
assert successes == 1, 'Cash and online must not both win'
assert query(f"select (payment_preference='cash' and stripe_checkout_key is null) or (payment_preference is null and stripe_checkout_key is not null) from public.app_payments where id='{bills[0]}'") == 't'
print('PASS: 12 concurrent purchases produce one bill and one credit item; cash/online race has one winner.')
