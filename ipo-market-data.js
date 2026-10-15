/* Manually verified India IPO editorial schedule, 15 Oct 2026 IST.
 * These are dated offer terms, NOT a live BSE/NSE subscription feed.
 * No direct subscription/grey-market data displayed without a timestamp.
 */
(function(root){
'use strict';
root.AngelIPOData={
  checkedAt:'2026-10-15T12:15:00+05:30',
  verifiedDate:'15 Oct 2026 (IST)',
  notice:'Editorial review: 15 Oct 2026 IST. Schedules reflect announced dates; not a live exchange feed. Verify RHP, issuer updates, exchanges, and registrar before applying. No allotment or gains are assured.',
  sources:{
    sebi:'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&smid=11&ssid=15',
    exchange:'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    bse:'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    groww:'https://groww.in/ipo/mainboard',
    calendar:'https://groww.in/ipo',
    reuters:'https://www.reuters.com/world/india/indias-zetwerk-sets-price-band-143-151-rupees-per-share-518-million-ipo-2026-10-12/',
    jioReuters:'https://www.reuters.com/world/india/mukesh-ambanis-jio-sets-price-band-india-ipo-2026-10-15/',
    financialExpress:'https://www.financialexpress.com/market/ipo-news-zetwerk-to-tonbo-imaging-4-mainboard-ipos-launching-oct-15-to-raise-rs-8870-crore-4360067/',
    expressHealth:'https://www.expresshealthcare.in/news/smt-ipo-to-open-on-october-15-price-band-set-at-rs-327-344-per-share/455532/',
    sebiConsultation:'https://www.reuters.com/legal/government/india-proposes-small-firm-ipo-overhaul-expands-role-institutional-investors-2026-10-14/'
  },
  issues:[
    {id:'jio-platforms',featured:true,name:'Jio Platforms',segment:'Mainboard',open:'2026-10-21',close:'2026-10-23',low:1065,high:1119,lot:12,size:'Up to ₹30,213 Cr',source:'jioReuters',filing:'Price band announced 14 Oct 2026; scheduled anchor bidding 19 Oct',notes:'Reliance Industries digital business. Planned fresh issue up to 270 million shares. Listing expected 28 Oct, subject to the issuer and exchange schedule.',detail:'ipo-jio-platforms.html'},
    {id:'hd-fire-protect',name:'HD Fire Protect',segment:'Mainboard',open:'2026-10-13',close:'2026-10-15',low:258,high:271,lot:55,size:'Approx. ₹712 Cr',source:'groww',notes:'Closing-window mainboard issue. Verify final bid closure time and terms in the exchange notice.'},
    {id:'fusion-cx',name:'Fusion CX',segment:'Mainboard',open:'2026-10-14',close:'2026-10-16',low:275,high:289,lot:51,size:'Approx. ₹702 Cr',source:'groww',notes:'Customer experience services; subscription window shown for 14–16 Oct, subject to offer terms.'},
    {id:'zetwerk',name:'Zetwerk Manufacturing Businesses',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:143,high:151,lot:99,size:'Approx. ₹5,012 Cr',source:'reuters',notes:'Manufacturing platform. Fresh issue and offer-for-sale reported by Reuters; refer to current RHP for complete risk factors.'},
    {id:'bonfiglioli',name:'Bonfiglioli Transmissions',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:558,high:586,lot:25,size:'Approx. ₹2,534 Cr',source:'financialExpress',notes:'Transmission and industrial drives. Indicative schedule of 15–19 Oct; verify with final filings.'},
    {id:'tonbo-imaging',name:'Tonbo Imaging India',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:665,high:700,lot:21,size:'Approx. ₹852 Cr',source:'financialExpress',notes:'Electro-optical and imaging technology. Expected to list 23 Oct; verify in official issue documents.'},
    {id:'sahajanand-medical',name:'Sahajanand Medical Technologies',segment:'Mainboard',open:'2026-10-15',close:'2026-10-19',low:327,high:344,lot:43,size:'Approx. ₹475 Cr',source:'expressHealth',notes:'Medical devices. All-offer-for-sale issue; company does not receive fresh proceeds from this offer.'},
    {id:'vaibhav-vyapaar',name:'Vaibhav Vyapaar',segment:'SME',open:'2026-10-13',close:'2026-10-15',low:51,high:54,lot:null,size:'Approx. ₹42 Cr',source:'calendar',notes:'SME offering. Lot size and final timings must be confirmed in the exchange notice.'},
    {id:'ravita-engineering',name:'Ravita Engineering Services',segment:'SME',open:'2026-10-14',close:'2026-10-16',low:105,high:112,lot:null,size:'Approx. ₹116 Cr',source:'calendar',notes:'SME offering. Opening revised to 14 Oct in current public calendars; verify exchange notice.'},
    {id:'shellz-india',name:'Shellz India',segment:'SME',open:'2026-10-15',close:'2026-10-19',low:170,high:179,lot:null,size:'Check prospectus',source:'calendar',notes:'SME offering; confirm lot size, price band and subscription window with BSE before action.'}
  ],
  briefing:[
    {date:'15 Oct 2026',topic:'Major upcoming IPO',title:'Jio Platforms publishes indicative offer band',summary:'Reliance digital business Jio Platforms is preparing an offering with a reported ₹1,065–₹1,119 band and a scheduled 21–23 October bidding window. Verify the final RHP and exchange timetable.',source:'jioReuters',detail:'ipo-jio-platforms.html',tag:'ANNOUNCED OFFER TERMS'},
    {date:'15 Oct 2026',topic:'Open issue',title:'Zetwerk subscription window opens',summary:'The manufacturing platform’s ₹143–₹151 public offer is scheduled for 15–19 October. Reported offer proceeds and valuation are subject to final offer documents.',source:'reuters',detail:'ipo-current.html#zetwerk',tag:'SOURCE-DATED'},
    {date:'14 Oct 2026',topic:'IPO regulations',title:'SEBI consults on SME IPO rule changes',summary:'A proposal, not a final rule: the regulator is considering stricter profitability criteria and a broader role for qualified institutional buyers in some SME offerings.',source:'sebiConsultation',detail:'ipo-current.html',tag:'PROPOSAL — NOT LAW'}
  ],
  archived:[
    {name:'R.K. Fashion Accessories',detail:'NSE SME listing review dated 12 Oct 2026. Dated price record, not a live quote.',link:'ipo-rk-fashion-accessories.html',official:'https://www.nseindia.com/get-quote/equity/RKFAL/R.K.-Fashion-Accessories-Limited'},
    {name:'VANS Electroengineerings',detail:'Historical listing review recorded 07 Oct 2026.',link:'ipo-vans-electroengineerings.html'},
    {name:'SRIT India',detail:'Historical GMP versus actual listing-price comparison.',link:'ipo-srit-india.html'}
  ]
};
})(window);
