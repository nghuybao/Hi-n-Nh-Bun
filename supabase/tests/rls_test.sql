-- Hiên Nhà Bun — kiểm thử Row Level Security (cho phép và từ chối).
-- Cách chạy: Supabase Dashboard -> SQL Editor -> dán toàn bộ tệp -> Run.
-- Yêu cầu: dự án đã có ÍT NHẤT HAI người dùng (vd. đăng nhập thử bằng hai email khác nhau).
-- Tệp chỉ ĐỌC danh sách người dùng trong auth.users, không sửa bảng đó.
-- Mọi dữ liệu thử được tạo bên trong một khối tự hoàn tác (rollback) ở cuối, nên không để lại gì.
-- Kết quả: bảng gồm tên phép thử, PASS/FAIL và chi tiết.

create or replace function pg_temp.bun_rls_tests()
returns table (test text, result text, detail text)
language plpgsql as $$
declare
  ua uuid; ub uuid; n bigint; r jsonb; rev_b bigint;
  out_t text[] := '{}'; out_r text[] := '{}'; out_d text[] := '{}';
begin
  select id into ua from auth.users order by created_at limit 1;
  select id into ub from auth.users where id <> ua order by created_at limit 1;
  if ua is null or ub is null then
    return query select 'chuẩn bị'::text, 'SKIP'::text, 'Cần ít nhất 2 người dùng trong Authentication > Users.'::text;
    return;
  end if;

  begin
    -- Dữ liệu mẫu (quyền postgres, bỏ qua RLS). Không ghi đè dữ liệu thật: chỉ thêm nếu chưa có.
    insert into public.game_saves (user_id, rev) values (ua, 1), (ub, 1) on conflict do nothing;
    insert into public.game_sections (user_id, section, data, rev) values (ua, 'misc', '{"t":"a"}', 1), (ub, 'misc', '{"t":"b"}', 1)
      on conflict (user_id, section) do nothing;
    insert into public.coin_events (user_id, event_id, amount, kind) values (ub, 'rls-test-b', 5, 'earn') on conflict do nothing;
    select rev into rev_b from public.game_saves where user_id = ub;

    -- ===== Đóng vai người dùng A =====
    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into n from public.game_saves where user_id = ub;
    out_t := out_t || 'A không đọc được game_saves của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n || ' dòng');
    select count(*) into n from public.game_sections where user_id = ub;
    out_t := out_t || 'A không đọc được game_sections của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n || ' dòng');
    select count(*) into n from public.coin_events where user_id = ub;
    out_t := out_t || 'A không đọc được sổ xu của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n || ' dòng');
    select count(*) into n from public.game_saves where user_id <> ua;
    out_t := out_t || 'Đọc không lọc chỉ thấy dữ liệu của mình'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('dòng của người khác: ' || n);
    select count(*) into n from public.game_saves where user_id = ua;
    out_t := out_t || 'A đọc được dữ liệu của chính mình'; out_r := out_r || (case when n = 1 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n || ' dòng');

    update public.game_sections set data = '{"hack":1}' where user_id = ub;
    get diagnostics n = row_count;
    out_t := out_t || 'A không sửa được game_sections của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('sửa ' || n || ' dòng');

    begin
      insert into public.game_sections (user_id, section, data, rev) values (ub, 'settings', '{"hack":1}', 9);
      out_t := out_t || 'A không chèn được dữ liệu mang user_id của B'; out_r := out_r || 'FAIL'; out_d := out_d || 'chèn được';
    exception when insufficient_privilege or check_violation then
      out_t := out_t || 'A không chèn được dữ liệu mang user_id của B'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      insert into public.coin_events (user_id, event_id, amount, kind) values (ub, 'rls-hack', 500, 'earn');
      out_t := out_t || 'A không ghi được vào sổ xu của B'; out_r := out_r || 'FAIL'; out_d := out_d || 'ghi được';
    exception when insufficient_privilege or check_violation then
      out_t := out_t || 'A không ghi được vào sổ xu của B'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      update public.coin_events set amount = 99999 where user_id = ua;
      out_t := out_t || 'Sổ xu không sửa được (kể cả của mình)'; out_r := out_r || 'FAIL'; out_d := out_d || 'sửa được';
    exception when insufficient_privilege then
      out_t := out_t || 'Sổ xu không sửa được (kể cả của mình)'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      delete from public.coin_events where user_id = ua;
      out_t := out_t || 'Sổ xu không xóa được'; out_r := out_r || 'FAIL'; out_d := out_d || 'xóa được';
    exception when insufficient_privilege then
      out_t := out_t || 'Sổ xu không xóa được'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      delete from public.game_saves where user_id = ub;
      get diagnostics n = row_count;
      out_t := out_t || 'A không xóa được bản lưu của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('xóa ' || n || ' dòng');
    exception when insufficient_privilege then
      out_t := out_t || 'A không xóa được bản lưu của B'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;

    -- save_game chỉ tác động lên dữ liệu của người gọi; sai rev thì báo xung đột
    select rev into n from public.game_saves where user_id = ua;
    r := public.save_game(n, '{"misc":{"t":"a2"}}'::jsonb, '[{"id":"rls-e1","amount":10,"kind":"earn"},{"id":"rls-e1","amount":10,"kind":"earn"},{"id":"rls-big","amount":999999,"kind":"earn"}]'::jsonb, 'rls-test');
    out_t := out_t || 'save_game tăng rev của A'; out_r := out_r || (case when (r ->> 'rev')::bigint = n + 1 then 'PASS' else 'FAIL' end); out_d := out_d || r::text;
    select count(*) into n from public.coin_events where user_id = ua and event_id in ('rls-e1', 'rls-big');
    out_t := out_t || 'Giao dịch trùng mã chỉ tính 1 lần, giao dịch quá giới hạn bị loại'; out_r := out_r || (case when n = 1 then 'PASS' else 'FAIL' end); out_d := out_d || ('giữ lại ' || n || ' giao dịch');
    begin
      perform public.save_game(0, '{}'::jsonb, '[]'::jsonb, 'rls-test');
      out_t := out_t || 'save_game với rev cũ báo xung đột'; out_r := out_r || 'FAIL'; out_d := out_d || 'không báo';
    exception when raise_exception then
      out_t := out_t || 'save_game với rev cũ báo xung đột'; out_r := out_r || (case when sqlerrm = 'conflict' then 'PASS' else 'FAIL' end); out_d := out_d || sqlerrm;
    end;
    begin
      perform public.save_game(1, '{"hack":{}}'::jsonb, '[]'::jsonb, 'rls-test');
      out_t := out_t || 'save_game từ chối phần dữ liệu lạ'; out_r := out_r || 'FAIL'; out_d := out_d || 'nhận';
    exception when invalid_parameter_value or raise_exception then
      out_t := out_t || 'save_game từ chối phần dữ liệu lạ'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;

    -- Ảnh: chỉ thư mục của chính mình
    begin
      insert into storage.objects (bucket_id, name, owner) values ('photos', ub::text || '/rls-test.jpg', ua);
      out_t := out_t || 'A không đưa ảnh vào thư mục của B'; out_r := out_r || 'FAIL'; out_d := out_d || 'đưa được';
    exception when insufficient_privilege or check_violation then
      out_t := out_t || 'A không đưa ảnh vào thư mục của B'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    when others then
      out_t := out_t || 'A không đưa ảnh vào thư mục của B'; out_r := out_r || 'SKIP'; out_d := out_d || ('không thử được trực tiếp: ' || sqlerrm);
    end;
    select count(*) into n from storage.objects where bucket_id = 'photos' and name like ub::text || '/%';
    out_t := out_t || 'A không thấy ảnh của B'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n);

    -- ===== Đóng vai người chưa đăng nhập (anon) =====
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('role', 'anon', true);
    begin
      select count(*) into n from public.game_saves;
      out_t := out_t || 'Khách chưa đăng nhập không đọc được dữ liệu'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n);
    exception when insufficient_privilege then
      out_t := out_t || 'Khách chưa đăng nhập không đọc được dữ liệu'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      perform public.save_game(1, '{}'::jsonb, '[]'::jsonb, 'anon');
      out_t := out_t || 'Khách chưa đăng nhập không gọi được save_game'; out_r := out_r || 'FAIL'; out_d := out_d || 'gọi được';
    exception when insufficient_privilege or invalid_authorization_specification then
      out_t := out_t || 'Khách chưa đăng nhập không gọi được save_game'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;
    begin
      select count(*) into n from public.coin_events;
      out_t := out_t || 'Khách chưa đăng nhập không đọc được sổ xu'; out_r := out_r || (case when n = 0 then 'PASS' else 'FAIL' end); out_d := out_d || ('thấy ' || n);
    exception when insufficient_privilege then
      out_t := out_t || 'Khách chưa đăng nhập không đọc được sổ xu'; out_r := out_r || 'PASS'; out_d := out_d || sqlerrm;
    end;

    perform set_config('role', 'postgres', true);
    -- B không bị ảnh hưởng bởi mọi thao tác của A
    select rev into n from public.game_saves where user_id = ub;
    out_t := out_t || 'Bản lưu của B giữ nguyên'; out_r := out_r || (case when n = rev_b then 'PASS' else 'FAIL' end); out_d := out_d || ('rev ' || n);

    raise exception 'bun_rls_rollback';
  exception when others then
    perform set_config('role', 'postgres', true);
    if sqlerrm <> 'bun_rls_rollback' then
      out_t := out_t || 'lỗi bất ngờ'; out_r := out_r || 'FAIL'; out_d := out_d || sqlerrm;
    end if;
  end;
  return query select * from unnest(out_t, out_r, out_d);
end $$;

select * from pg_temp.bun_rls_tests();
