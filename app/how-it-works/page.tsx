import {
  PageNavigation,
  SubpageHeader,
} from "@/components/PageNavigation";

export default function HowItWorksPage() {
  return (
    <main className="subpage-main method-page">
      <SubpageHeader kicker="HOW IT WORKS" title="網站介紹" />

      <section className="method-section standalone-method" aria-labelledby="method-title">
        <div className="method-heading">
          <span>逐關回測</span>
          <h1 id="method-title">不是算一個總分，而是逐關判斷。</h1>
        </div>
        <p className="method-lead">
          系統依 114 學年度官方通過倍率篩選最低級分回測。若一個校系有多關篩選，
          每一關都會使用自己的科目組合與門檻，所有關卡通過才列為可能通過。
        </p>

        <div className="method-grid">
          <article>
            <span>01</span>
            <h2>每關獨立加總</h2>
            <p>每一筆規則都有自己的科目組合與最低級分，不共用單一總分。</p>
          </article>
          <article>
            <span>02</span>
            <h2>全部過關才算通過</h2>
            <p>多關校系必須每一關都達標；任一關不足，結果會列出該關差距。</p>
          </article>
          <article>
            <span>03</span>
            <h2>搜尋最少補分</h2>
            <p>只搜尋該校系用到的科目，並遵守單科最高 15 級分。</p>
          </article>
        </div>

        <div className="formula-card">
          <span>一筆規則</span>
          <code>sum(使用者科目級分) ≥ 官方通過篩選最低級分</code>
          <p>一個校系 = 一組 rules[]；所有 rules 通過，Program 才通過。</p>
        </div>

        <aside className="method-notice">
          本網站提供歷史資料回測，不代表下一學年度一定通過；正式選填前仍應回查甄選委員會公告。
        </aside>
      </section>

      <PageNavigation
        nextLabel="下一頁：開始輸入"
        nextRoute="query"
        previousLabel="前一頁：首頁"
        previousRoute="home"
      />
    </main>
  );
}
