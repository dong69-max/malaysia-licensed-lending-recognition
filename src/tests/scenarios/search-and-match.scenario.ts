import { scenario, step, expect } from 'kliv-scenario';

const world = {
  database: [
    {
      table: 'companies',
      rows: [
        {
          company_name: 'DEMO CREDIT SDN BHD',
          normalized_name: 'DEMO CREDIT',
          ssm_number: 'DEMO-199901000001',
          business_type: 'Moneylending (演示)',
          jurisdiction: '半岛',
          authority: 'KPKT',
          state: 'Johor',
          district: 'Johor Bahru',
          registered_address: '演示地址 1, Johor Bahru',
          operating_address: '演示地址 1, Johor Bahru',
          phone: '07-0000001',
          online_lending_approved: 'unknown',
          source: 'DEMO 演示资料',
          verified_at: '2026-01-01',
          is_demo: 1,
        },
      ],
    },
    {
      table: 'licenses',
      rows: [
        {
          company_id: 1,
          license_number: 'WL0000/01/01-10/311226',
          license_type: 'Moneylenders Licence (演示)',
          license_start_date: '2025-01-01',
          license_expiry_date: '2026-12-31',
          status: 'active',
          state: 'Johor',
          district: 'Johor Bahru',
          source: 'DEMO 演示资料',
          verified_at: '2026-01-01',
        },
      ],
    },
    {
      table: 'company_aliases',
      rows: [
        {
          company_id: 1,
          alias_name: 'DEMO CREDIT SDN BHD',
          normalized_alias: 'DEMO CREDIT',
          alias_type: '正式名称',
        },
        {
          company_id: 1,
          alias_name: 'PAYNET DEMO CREDIT',
          normalized_alias: 'DEMO CREDIT',
          alias_type: '银行流水名称',
        },
      ],
    },
  ],
};

scenario('员工搜索流水名称并查看公司资料', { setup: world }, async ({ page }) => {
  await step('首页显示主要入口', async () => {
    await page.goto('/');
    await expect(page.getByText('全马持牌放贷识别系统')).toBeVisible();
    await expect(page.getByText('扫描银行流水').first()).toBeVisible();
  });

  await step('进入搜索页', async () => {
    await page.getByText('搜索贷款公司').first().click();
    await expect(page.getByPlaceholder('公司名称')).toBeVisible();
  });

  await step('用 OCR 缩写写法搜索', async () => {
    await page.getByPlaceholder('公司名称').fill('demo crdt');
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(page.getByText('DEMO CREDIT SDN BHD').first()).toBeVisible();
  });

  await step('打开公司资料页', async () => {
    await page.getByRole('link', { name: '查看公司资料' }).first().click();
    await expect(page.getByText('WL0000/01/01-10/311226')).toBeVisible();
    await expect(page.getByText('Johor Bahru').first()).toBeVisible();
  });
});

scenario('查询交易名称后记录匹配结果与当时牌照状态', { setup: world }, async ({ page }) => {
  await step('查询一笔 2026 年的交易', async () => {
    await page.goto('/result?name=PAYNET%20DEMO%20CREDIT&date=2026-08-12&amount=850.00');
    await expect(page.getByText('系统识别结果')).toBeVisible();
    await expect(page.getByText('DEMO CREDIT SDN BHD').first()).toBeVisible();
  });

  await step('显示交易日期当时的牌照状态', async () => {
    await expect(page.getByText('该公司的牌照在交易日期有效')).toBeVisible();
  });

  await step('查询记录里出现这次查询', async () => {
    await page.goto('/records');
    await expect(page.getByText('PAYNET DEMO CREDIT').first()).toBeVisible();
    await expect(page.getByText('DEMO CREDIT SDN BHD').first()).toBeVisible();
  });
});

scenario('未找到匹配时只提示数据库没有记录', { setup: world }, async ({ page }) => {
  await step('查询一个数据库没有的名称', async () => {
    await page.goto('/result?name=QWERTY%20LOGISTICS%20BERHAD&date=2026-08-12');
    await expect(page.getByText('未找到匹配记录')).toBeVisible();
    await expect(page.getByText('当前数据库没有找到足够可靠的匹配记录')).toBeVisible();
  });

  await step('不得出现任何合法性判断', async () => {
    await expect(page.getByText('不是合法贷款公司')).toHaveCount(0);
    await expect(page.getByText('非法')).toHaveCount(0);
  });

  await step('提供后续操作', async () => {
    await expect(page.getByRole('link', { name: '手动搜索公司' })).toBeVisible();
    await expect(page.getByRole('link', { name: '重新扫描' })).toBeVisible();
  });
});
