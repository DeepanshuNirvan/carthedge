-- Marketing copy that was hardcoded in the frontend now lives in site_settings,
-- so the admin console edits it live. Seeds match the shipped defaults.
insert into site_settings (key, value) values
('stats', '[
  {"value":30,"suffix":"%","label":"of COD orders refused at the door — pure RTO loss"},
  {"value":6,"suffix":" hrs","label":"a week chasing \"payment kar diya?\" screenshots"},
  {"value":100,"suffix":"s","label":"of orders living in chat scrolls and notebooks"}
]'),
('testimonials', '[
  {"quote":"RTO went from 27% to 9% in the first month. The COD confirm flow alone pays for the year.","name":"Ritika S.","business":"Jaipur juttis & bags","metric":"₹31,000 saved in month one"},
  {"quote":"I used to screenshot orders into a notebook. Now the DM becomes an order in one tap.","name":"Farheen A.","business":"Modest fashion, Hyderabad","metric":"4 hours saved weekly"},
  {"quote":"My resellers get their prices automatically. No more two price lists on WhatsApp.","name":"Devanshi P.","business":"Silver jewellery, Rajkot","metric":"2× reseller volume"}
]'),
('faqs', '[
  {"q":"Do my buyers need to install anything?","a":"No. The storefront and checkout open in any browser — including the Instagram and WhatsApp in-app browsers. Buyers verify with a phone OTP and pay by UPI, card or COD."},
  {"q":"How does CartHedge cut RTO?","a":"Before a COD order ships, the buyer confirms intent on WhatsApp — optionally with a small token payment. Serial refusers get flagged in your ledger, so you decide who still gets COD."},
  {"q":"Does it work with my courier?","a":"CartHedge hands orders to Shiprocket with validated addresses, and tracks status back to your board. More couriers are on the roadmap."},
  {"q":"Where does the payment go?","a":"Straight to your Razorpay account or UPI. CartHedge charges a flat monthly plan — we never take a cut of your sales."},
  {"q":"Can I import my existing catalog?","a":"Yes — bulk CSV or JSON import with a mapping preview, including variants and reseller prices."},
  {"q":"What happens after the trial?","a":"Pick a plan inside the app. If you wait, your data stays safe — the store just pauses until you subscribe."}
]')
on conflict (key) do nothing;
