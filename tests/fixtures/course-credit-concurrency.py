"""Run after course-credits-database.sql in a disposable local database only."""
import json
import subprocess
import sys

socket, port, database = sys.argv[1:]
if not socket.startswith(('/tmp/anna-course-pg.', '/private/tmp/anna-course-pg.')) or database != 'course_test':
    raise SystemExit('Only the isolated course_test database is allowed')
base = ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', port, '-d', database]
def run(sql):
    return subprocess.run(base, input=sql, text=True, capture_output=True, check=True, timeout=15).stdout
owner = '00000000-0000-4000-8000-000000000001'
bill = '50000000-0000-4000-8000-000000000010'
snapshot = dict(account='acct_course', livemode=True, paymentIntent='pi_concurrentcourse', amount=10301,
                currency='usd', description='Concurrent credit', paidAt='2026-09-21T10:00:00Z',
                observedAt='2026-09-21T10:00:00Z', refundState='none', refundedAmount=0)
run(f"""set role service_role;
select public.app_stripe_bill('import','{owner}','{bill}','{json.dumps(snapshot)}');
update public.app_payment_items set course_key='solo30',stripe_product_id='prod_solo',credit_count=1,lesson_duration_minutes=30 where payment_id='{bill}';""")
item = run(f"select id from public.app_payment_items where payment_id='{bill}';").strip()
def allocate(suffix, day):
    entries = json.dumps([dict(id=f'60000000-0000-4000-8000-0000000000{suffix}', starts_at=f'2028-01-{day}T15:00:00Z')])
    return f"select public.app_manage_course_schedule('{owner}','{item}','test','create','{entries}');"
a = subprocess.Popen(base, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
a.stdin.write('set role service_role; begin;\n' + allocate('10','10') + "\n\\echo reserved\nselect pg_sleep(1); commit;\n")
a.stdin.close()
assert a.stdout.readline().strip() == ''
assert a.stdout.readline().strip() == 'reserved'
b = subprocess.run(base, input='set role service_role;\n'+allocate('11','11'), text=True, capture_output=True, timeout=15)
a.wait(timeout=15)
assert a.returncode == 0, a.stderr.read()
assert b.returncode != 0 and 'No lesson credits available' in b.stderr, b.stderr
assert run(f"select count(*) from public.app_schedule_entries where payment_item_id='{item}';").strip() == '1'
print('PASS: concurrent requests cannot spend the final credit twice')

# Refund waits for an in-flight reschedule and cancels its resulting allocation.
a = subprocess.Popen(base, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
entries = json.dumps([dict(id='60000000-0000-4000-8000-000000000010', revision=0, starts_at='2028-01-12T15:00:00Z')])
a.stdin.write(f"set role service_role; begin; select public.app_manage_course_schedule('{owner}','{item}','test','reschedule','{entries}');\n\\echo changed\nselect pg_sleep(1); commit;\n")
a.stdin.close()
assert a.stdout.readline().strip() == ''
assert a.stdout.readline().strip() == 'changed'
snapshot.update(observedAt='2026-09-21T10:01:00Z', refundState='succeeded', refundedAmount=10301, refundId='re_concurrentcourse', refundConfirmedAt='2026-09-21T10:01:00Z')
run(f"set role service_role; select public.app_stripe_bill('sync','{owner}','{bill}','{json.dumps(snapshot)}');")
a.wait(timeout=15)
assert a.returncode == 0, a.stderr.read()
assert run("select status from public.app_schedule_entries where id='60000000-0000-4000-8000-000000000010';").strip() == 'cancelled'
print('PASS: concurrent refund cancels the committed future allocation')
