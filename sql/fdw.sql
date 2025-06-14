IMPORT FOREIGN SCHEMA public
  FROM SERVER user_test_server INTO public;

IMPORT FOREIGN SCHEMA public
  FROM SERVER group_test_server INTO public;

-- 建立 group_user_combine 的 materialized view，結合 group、user、group_user 三表
CREATE MATERIALIZED VIEW mv_group_user AS
SELECT
  g.id AS group_id,
  g.name AS group_name,
  u.id AS user_id,
  u.account,
  u.email,
  u.display_name
FROM
  group_user gu
  JOIN "group" g ON gu.group_id = g.id
  JOIN "user" u ON gu.user_id = u.id;
