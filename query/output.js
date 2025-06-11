function output({
  total,
  results,
}) {
  console.log(`共找到 ${total} 筆符合條件，當前頁資料如下：`);
  console.log('%o', results);
}

export { output };
