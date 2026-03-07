import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    catalog: "Service Catalog",
    catalogDesc: "Internal service reference and pricing",
    feedback: "Feedback",
    healthForm: "Health Form",
    submissions: "Submissions",
    signOut: "Sign Out",
    addToCart: "Add to Catalog",
    addedToCart: "Added to cart",
    cartAddedDesc: "has been added to your cart.",
    selectTherapist: "Select Therapist",
    therapist: "Therapist",
    tipAmount: "Tip Amount",
    completeFeedbackFirst: "Please complete feedback first",
    printPreviewAvailable: "Print Preview Available",
    feedbackLink: "Feedback Link",
  },
  ja: {
    catalog: "サービスカタログ",
    catalogDesc: "内部サービス参照と価格設定",
    feedback: "フィードバック",
    healthForm: "健康フォーム",
    submissions: "提出物",
    signOut: "サインアウト",
    addToCart: "カタログに追加",
    addedToCart: "カートに追加されました",
    cartAddedDesc: "がカートに追加されました。",
    selectTherapist: "セラピストを選択",
    therapist: "セラピスト",
    tipAmount: "チップの金額",
    completeFeedbackFirst: "最初にフィードバックを完了してください",
    printPreviewAvailable: "印刷プレビューが利用可能",
    feedbackLink: "フィードバックリンク",
  },
  ko: {
    catalog: "서비스 카탈로그",
    catalogDesc: "내부 서비스 참조 및 가격",
    feedback: "피드백",
    healthForm: "건강 양식",
    submissions: "제출물",
    signOut: "로그아웃",
    addToCart: "카탈로그에 추가",
    addedToCart: "장바구니에 추가됨",
    cartAddedDesc: "장바구니에 추가되었습니다.",
    selectTherapist: "치료사 선택",
    therapist: "치료사",
    tipAmount: "팁 금액",
    completeFeedbackFirst: "먼저 피드백을 완료하십시오",
    printPreviewAvailable: "인쇄 미리보기 가능",
    feedbackLink: "피드백 링크",
  },
  zh: {
    catalog: "服务目录",
    catalogDesc: "内部服务参考和定价",
    feedback: "反馈",
    healthForm: "健康表",
    submissions: "提交",
    signOut: "登出",
    addToCart: "添加到目录",
    addedToCart: "已添加到购物车",
    cartAddedDesc: "已添加到您的购物车。",
    selectTherapist: "选择治疗师",
    therapist: "治疗师",
    tipAmount: "小费金额",
    completeFeedbackFirst: "请先完成反馈",
    printPreviewAvailable: "提供打印预览",
    feedbackLink: "反馈链接",
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('lema_language');
    if (savedLang && translations[savedLang]) {
      setCurrentLanguage(savedLang);
    }
  }, []);

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem('lema_language', lang);
    }
  };

  const t = (key) => {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);