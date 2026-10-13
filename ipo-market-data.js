/* Curated issue schedule. Editorial verification: 13 Oct 2026 IST.
   Source links are directories/articles, not live subscription feeds. No API polling. */
(function(root){
  'use strict';
  root.AngelIPOData={
    checkedAt:'2026-10-13T12:00:00+05:30',
    verifiedDate:'13 Oct 2026 (IST)',
    notice:'Editorial schedule checked 13 Oct 2026 IST. Offer terms and dates may change. Status reflects the listed schedule, not a live exchange connection.',
    sources:{
      sebi:'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&smid=11&ssid=15',
      exchange:'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      businessstandard:'https://www.business-standard.com/markets/ipo',
      idbi:'https://www.idbidirect.in/Markets/IPO/ForthComing-Issues.aspx',
      reuters:'https://www.reuters.com/world/india/indias-zetwerk-sets-price-band-143-151-rupees-per-share-518-million-ipo-2026-10-12/'
    },
    issues:[
      {id:'hd-fire-protect',name:'HD Fire Protect',segment:'Mainboard',open:'2026-10-13',close:'2026-10-15',low:258,high:271,lot:55,size:'₹712.31 Cr',source:'idbi',filing:'SEBI RHP listed 05 Oct 2026',notes:'Fire protection equipment. Confirm offer terms and allotment timetable against the latest RHP.'},
      {id:'ravita-engineering',name:'Ravita Engineering Services',segment:'SME',open:'2026-10-13',close:'2026-10-15',low:105,high:112,lot:null,size:'Approx. ₹116.05 Cr',source:'businessstandard',notes:'SME issue. Opening date varies across some public calendars; confirm the latest NSE notice before acting.'},
      {id:'vaibhav-vyapaar',name:'Vaibhav Vyapaar',segment:'SME',open:'2026-10-13',close:'2026-10-15',low:51,high:54,lot:null,size:'Approx. ₹42.10 Cr',source:'idbi',notes:'SME issue; check the official exchange calendar for final terms.'},
      {id:'fusion-cx',name:'Fusion CX',segment:'Mainboard',open:'2026-10-14',close:'2026-10-16',low:275,high:289,lot:51,size:'₹702 Cr',source:'businessstandard',notes:'Customer-experience services company. Read the offer document for business and risk disclosures.'},
      {id:'zetwerk',name:'Zetwerk Manufacturing Businesses',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:143,high:151,lot:99,size:'Approx. ₹5,012 Cr',source:'reuters',notes:'Manufacturing-services platform. Reuters reported a fresh issue and an offer-for-sale on 12 Oct 2026.'},
      {id:'bonfiglioli',name:'Bonfiglioli Transmissions',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:558,high:586,lot:25,size:'Approx. ₹2,534 Cr',source:'idbi',notes:'Power-transmission and drive-related products. Check the latest prospectus for full risk factors.'},
      {id:'tonbo-imaging',name:'Tonbo Imaging India',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:665,high:700,lot:21,size:'₹852.18 Cr',source:'idbi',filing:'SEBI RHP listed 12 Oct 2026',notes:'Imaging and electro-optical technology. Details should be read alongside the official RHP.'},
      {id:'sahajanand-medical',name:'Sahajanand Medical Technologies',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:327,high:344,lot:43,size:'₹475.48 Cr',source:'idbi',filing:'SEBI RHP listed 10 Oct 2026',notes:'Medical-device business. Read the official RHP for product, market and regulatory risks.'},
      {id:'shellz-india',name:'Shellz India',segment:'SME',open:'2026-10-15',close:'2026-10-19',low:170,high:179,lot:null,size:'Approx. ₹60 Cr',source:'businessstandard',notes:'SME issue; cross-check the prospectus and exchange notice for final terms.'}
    ],
    archived:[
      {name:'R.K. Fashion Accessories',detail:'NSE SME listing on 12 Oct 2026. Issue price ₹82; opening ₹80; 12 Oct closing ₹76.',link:'ipo-rk-fashion-accessories.html',official:'https://www.nseindia.com/get-quote/equity/RKFAL/R.K.-Fashion-Accessories-Limited'},
      {name:'VANS Electroengineerings',detail:'Historical listing review recorded 07 Oct 2026.',link:'ipo-vans-electroengineerings.html'},
      {name:'SRIT India',detail:'Historical GMP versus actual listing-price comparison.',link:'ipo-srit-india.html'}
    ]
  };
})(window);
