const pool = require('./db');

const PRE_DESIGNED_TEMPLATES = [
  {
    template_name: 'New Seasonal Collection Drop',
    category: 'Sell products',
    industry: 'E-commerce & retail',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop',
    plain_text_content: 'Discover the New Autumn/Winter Collection. Get 20% off with code FALL20. Shop now!',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Seasonal Collection</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Top Announcement Bar -->
          <tr>
            <td align="center" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
              🔥 FLASH SALE: FREE EXPRESS SHIPPING ON ORDERS OVER $75
            </td>
          </tr>

          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding: 24px 20px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 24px; font-weight: 800; tracking: 2px; color: #0f172a; font-family: 'Georgia', serif;">AURA & CO.</span>
            </td>
          </tr>

          <!-- Hero Image & Title -->
          <tr>
            <td style="padding: 0; position: relative;">
              <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop" alt="Autumn Collection" width="100%" style="display: block; width: 100%; max-height: 320px; object-fit: cover;">
            </td>
          </tr>

          <!-- Main Hero Content -->
          <tr>
            <td align="center" style="padding: 32px 24px;">
              <span style="color: #6366f1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">NEW SEASON ARRIVALS</span>
              <h1 style="margin: 8px 0 16px 0; font-size: 30px; font-weight: 800; color: #0f172a; line-height: 1.2;">The Autumn Collection is Here</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #64748b; max-width: 480px;">
                Designed for comfort, crafted for elegance. Explore our fresh drop of tailored jackets, cozy knitwear, and timeless footwear.
              </p>
              <a href="#" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">EXPLORE CATALOG &rarr;</a>
            </td>
          </tr>

          <!-- Discount Banner -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; border: 1px dashed #cbd5e1;">
                <p style="margin: 0; font-size: 14px; color: #475569; font-weight: 600;">Use promo code at checkout for 20% OFF:</p>
                <span style="display: inline-block; margin-top: 8px; font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: 2px;">AUTUMN20</span>
              </div>
            </td>
          </tr>

          <!-- Featured Products Grid -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; text-align: center;">Trending Highlights</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" style="vertical-align: top; padding-right: 2%;">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop" width="100%" style="display: block; height: 180px; object-fit: cover;">
                      <div style="padding: 12px;">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a;">Wool Blend Trench</h4>
                        <span style="font-weight: 700; font-size: 14px; color: #4f46e5;">$149.00</span>
                      </div>
                    </div>
                  </td>
                  <td width="48%" style="vertical-align: top; padding-left: 2%;">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop" width="100%" style="display: block; height: 180px; object-fit: cover;">
                      <div style="padding: 12px;">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a;">Minimalist Knit Sweater</h4>
                        <span style="font-weight: 700; font-size: 14px; color: #4f46e5;">$89.00</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Daily Glow & Skincare Routine',
    category: 'Newsletter',
    industry: 'Health & wellness',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
    plain_text_content: 'Transform your skin in 3 steps with our organic botanical skincare collection.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Glow Skincare</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fcf8f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #332d2b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fcf8f6; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px rgba(186,134,115,0.1); border: 1px solid #f2e3dd;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 28px 20px; background-color: #fff9f6; border-bottom: 1px solid #f7ede8;">
              <span style="font-size: 22px; font-weight: 600; color: #9c6644; font-family: 'Georgia', serif; letter-spacing: 2px;">BOTANICA LABS</span>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop" alt="Botanical Skincare" width="100%" style="display: block; width: 100%; max-height: 300px; object-fit: cover;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td align="center" style="padding: 36px 28px;">
              <span style="color: #b07d62; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">WELLNESS & BEAUTY GUIDE</span>
              <h1 style="margin: 10px 0 16px 0; font-size: 28px; font-weight: 700; color: #4a3b32; line-height: 1.3;">Build Your 3-Step Daily Routine</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #7f6a5d;">
                Nourish, protect, and restore your skin naturally. Our dermatologist-approved formulations harness pure plant extracts for vibrant, hydrated skin all day long.
              </p>
            </td>
          </tr>

          <!-- 3 Steps Section -->
          <tr>
            <td style="padding: 0 28px 32px 28px;">
              <div style="background-color: #fdf6f0; border-radius: 16px; padding: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <span style="display: inline-block; width: 32px; height: 32px; background-color: #ddb892; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold;">1</span>
                    </td>
                    <td style="padding-left: 12px; font-size: 14px; line-height: 1.5; color: #5c4d44;">
                      <strong>Gentle Hydrating Cleanser:</strong> Removes impurities without drying natural oils.
                    </td>
                  </tr>
                  <tr><td height="16"></td></tr>
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <span style="display: inline-block; width: 32px; height: 32px; background-color: #ddb892; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold;">2</span>
                    </td>
                    <td style="padding-left: 12px; font-size: 14px; line-height: 1.5; color: #5c4d44;">
                      <strong>Vitamin C Radiance Serum:</strong> Brightens complexion and protects against environmental stress.
                    </td>
                  </tr>
                  <tr><td height="16"></td></tr>
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <span style="display: inline-block; width: 32px; height: 32px; background-color: #ddb892; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold;">3</span>
                    </td>
                    <td style="padding-left: 12px; font-size: 14px; line-height: 1.5; color: #5c4d44;">
                      <strong>Barrier Renewal Cream:</strong> Locks in moisture for 24-hour supple glow.
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 28px 36px 28px;">
              <a href="#" style="display: inline-block; background-color: #9c6644; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 600; font-size: 15px;">GET YOUR WELLNESS BUNDLE</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Artisan Coffee & Culinary Experience',
    category: 'Announce',
    industry: 'Food & travel',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
    plain_text_content: 'Join our exclusive Gourmet Roasters Workshop & Chef Tasting Evening.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Artisan Coffee Experience</title>
</head>
<body style="margin: 0; padding: 0; background-color: #12100e; font-family: 'Georgia', serif; color: #f4efe9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #12100e; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #1c1815; border-radius: 16px; overflow: hidden; border: 1px solid #332b25; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #12100e; border-bottom: 1px solid #28221d;">
              <span style="font-size: 22px; font-weight: 700; color: #d4a373; letter-spacing: 3px; text-transform: uppercase;">THE ROASTERY & CO.</span>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop" alt="Artisan Coffee" width="100%" style="display: block; width: 100%; max-height: 320px; object-fit: cover;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td align="center" style="padding: 36px 28px;">
              <span style="color: #d4a373; font-size: 12px; font-weight: 700; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px;">EXCLUSIVE INVITATION</span>
              <h1 style="margin: 12px 0 16px 0; font-size: 32px; font-weight: 400; color: #faedcd; line-height: 1.2;">Artisan Roast & Tasting Masterclass</h1>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.8; color: #ccd5ae; font-family: sans-serif;">
                Experience single-origin coffees paired with handcrafted pastries. Guided by world-renowned barista champion Marcus Vance.
              </p>
              
              <!-- Event details card -->
              <div style="background-color: #28221d; border: 1px solid #423830; border-radius: 12px; padding: 20px; max-width: 440px; text-align: left; font-family: sans-serif; font-size: 14px;">
                <p style="margin: 0 0 8px 0; color: #faedcd;">📍 <strong>Venue:</strong> Grand Roastery, Downtown Ave</p>
                <p style="margin: 0 0 8px 0; color: #faedcd;">📅 <strong>Date:</strong> Saturday, September 12th | 6:00 PM</p>
                <p style="margin: 0; color: #faedcd;">🎟️ <strong>Seats:</strong> Limited to 25 VIP Guests</p>
              </div>

              <a href="#" style="display: inline-block; margin-top: 28px; background-color: #d4a373; color: #12100e; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 14px; font-family: sans-serif; letter-spacing: 1px;">RESERVE YOUR SEAT &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Quarterly Financial Report & Insights',
    category: 'Newsletter',
    industry: 'Business & finance',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop',
    plain_text_content: 'Quarterly Market Performance Report: Q3 Growth & Revenue Overview.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Financial Report & Insights</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #cbd5e1;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 20px 28px; background-color: #1e293b; color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 18px; font-weight: 700; letter-spacing: 1px; color: #38bdf8;">
                    STRATIS CAPITAL
                  </td>
                  <td align="right" style="font-size: 12px; color: #94a3b8;">
                    Q3 FINANCIAL BRIEFING
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding: 32px 28px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px;">EXECUTIVE SUMMARY</span>
              <h1 style="margin: 8px 0 12px 0; font-size: 26px; font-weight: 800; color: #0f172a;">Q3 Portfolio Growth & Market Insights</h1>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #64748b;">
                Our third quarter results demonstrate strong resilience and accelerated expansion across cloud enterprise investments. Here is a high-level breakdown of core metrics.
              </p>
            </td>
          </tr>

          <!-- KPI Cards Grid (2x2) -->
          <tr>
            <td style="padding: 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" style="vertical-align: top; padding-right: 2%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                      <span style="font-size: 12px; color: #64748b; font-weight: 600;">NET REVENUE</span>
                      <h3 style="margin: 6px 0 2px 0; font-size: 24px; font-weight: 800; color: #0f172a;">$4.2M</h3>
                      <span style="font-size: 12px; font-weight: 700; color: #16a34a;">↑ +28.4% YoY</span>
                    </div>
                  </td>
                  <td width="48%" style="vertical-align: top; padding-left: 2%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                      <span style="font-size: 12px; color: #64748b; font-weight: 600;">ACTIVE INVESTORS</span>
                      <h3 style="margin: 6px 0 2px 0; font-size: 24px; font-weight: 800; color: #0f172a;">14,850</h3>
                      <span style="font-size: 12px; font-weight: 700; color: #16a34a;">↑ +14.2% MoM</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Download PDF -->
          <tr>
            <td align="center" style="padding: 0 28px 32px 28px;">
              <a href="#" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 8px; font-weight: 700; font-size: 14px;">DOWNLOAD FULL 24-PAGE PDF REPORT &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Creative Agency Portfolio & Case Study',
    category: 'Portfolio',
    industry: 'Creative services',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1542744094-3a317272018a?w=800&auto=format&fit=crop',
    plain_text_content: 'Explore our latest UI/UX and brand design case studies at Studio Craft.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Agency Showcase</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #16181e; border-radius: 16px; overflow: hidden; border: 1px solid #2d313e; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; border-bottom: 1px solid #252834;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">STUDIO CRAFT<span style="color: #8b5cf6;">.</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #a1a1aa; font-weight: 600;">DESIGN & INNOVATION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1542744094-3a317272018a?w=800&auto=format&fit=crop" alt="Agency Studio" width="100%" style="display: block; width: 100%; max-height: 280px; object-fit: cover;">
            </td>
          </tr>

          <!-- Intro Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <span style="color: #a78bfa; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">FEATURED CASE STUDY</span>
              <h1 style="margin: 8px 0 16px 0; font-size: 28px; font-weight: 800; color: #ffffff; line-height: 1.2;">Rebranding Fintech Unicorn: Apex Pay</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #a1a1aa;">
                We helped Apex Pay transform their digital product identity, leading to a 42% increase in mobile conversion rates and winning 3 Webby Awards in 2026.
              </p>
              
              <!-- Core Services Badges -->
              <div style="margin-bottom: 28px;">
                <span style="display: inline-block; background-color: #252834; color: #d4d4d8; font-size: 12px; padding: 6px 14px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px;">UI/UX Architecture</span>
                <span style="display: inline-block; background-color: #252834; color: #d4d4d8; font-size: 12px; padding: 6px 14px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px;">Brand Identity</span>
                <span style="display: inline-block; background-color: #252834; color: #d4d4d8; font-size: 12px; padding: 6px 14px; border-radius: 20px;">3D Motion Graphics</span>
              </div>

              <a href="#" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 14px;">VIEW FULL CASE STUDY &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Empower Future Leaders Course & Scholarship',
    category: 'Welcome',
    industry: 'Education & nonprofit',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop',
    plain_text_content: 'Applications are now open for the 2026 Tech Leadership Academy Scholarship.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Education Scholarship Program</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #166534;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(22,101,52,0.08); border: 1px solid #bbf7d0;">
          
          <!-- Top Header -->
          <tr>
            <td align="center" style="padding: 24px 20px; background-color: #14532d; color: #ffffff;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: 1px;">FUTURE ACADEMY FOUNDATION</span>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop" alt="Students Learning" width="100%" style="display: block; width: 100%; max-height: 280px; object-fit: cover;">
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td align="center" style="padding: 32px 24px;">
              <span style="color: #16a34a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">SCHOLARSHIP ANNOUNCEMENT</span>
              <h1 style="margin: 10px 0 16px 0; font-size: 28px; font-weight: 800; color: #064e3b; line-height: 1.3;">Empowering 1,000 Next-Gen Tech Scholars</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #374151;">
                We are thrilled to launch the 2026 Tech & Leadership Scholarship initiative. Applications are now open for full tuition support in software development, data analytics, and AI fundamentals.
              </p>

              <!-- Impact Stats Box -->
              <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; width: 100%; box-sizing: border-border-box; margin-bottom: 24px; border: 1px solid #dcfce7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" width="50%" style="border-right: 1px solid #bbf7d0;">
                      <h2 style="margin: 0; font-size: 28px; color: #15803d; font-weight: 800;">$150K+</h2>
                      <span style="font-size: 12px; color: #166534; font-weight: 600;">FUNDING RAISED</span>
                    </td>
                    <td align="center" width="50%">
                      <h2 style="margin: 0; font-size: 28px; color: #15803d; font-weight: 800;">100%</h2>
                      <span style="font-size: 12px; color: #166534; font-weight: 600;">FREE TUITION</span>
                    </td>
                  </tr>
                </table>
              </div>

              <a href="#" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 700; font-size: 15px;">APPLY FOR SCHOLARSHIP NOW &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Luxury Living & Room Refresh Guide',
    category: 'Seasonal',
    industry: 'Home & garden',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop',
    plain_text_content: 'Elevate your living space with our modern Scandinavian furniture collection.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Luxury Living Room Refresh</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f6f2; font-family: 'Georgia', serif; color: #2d2b27;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f6f2; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e3dc; box-shadow: 0 8px 24px rgba(0,0,0,0.04);">
          
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding: 28px 20px; background-color: #ffffff;">
              <span style="font-size: 22px; font-weight: 400; letter-spacing: 3px; color: #2d2b27; text-transform: uppercase;">MAISON INTERIORS</span>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop" alt="Living Room Design" width="100%" style="display: block; width: 100%; max-height: 320px; object-fit: cover;">
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td align="center" style="padding: 36px 28px;">
              <span style="color: #8c7a6b; font-size: 11px; font-weight: 700; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px;">INTERIOR STYLE LOOKBOOK</span>
              <h1 style="margin: 10px 0 16px 0; font-size: 30px; font-weight: 400; color: #1c1b18; line-height: 1.2;">Your Autumn Room Refresh is Here</h1>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.8; color: #66625a; font-family: sans-serif;">
                Transform your living sanctuary with natural oak woods, textured linen sofas, and warm ambient lighting tailored for cozy evenings.
              </p>

              <!-- Feature Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family: sans-serif;">
                <tr>
                  <td width="48%" style="vertical-align: top; padding-right: 2%;">
                    <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&auto=format&fit=crop" width="100%" style="border-radius: 8px; display: block; height: 140px; object-fit: cover;">
                    <h4 style="margin: 10px 0 4px 0; font-size: 14px; color: #1c1b18;">The Harbor Oak Sofa</h4>
                    <span style="font-size: 13px; color: #8c7a6b; font-weight: 600;">From $890</span>
                  </td>
                  <td width="48%" style="vertical-align: top; padding-left: 2%;">
                    <img src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop" width="100%" style="border-radius: 8px; display: block; height: 140px; object-fit: cover;">
                    <h4 style="margin: 10px 0 4px 0; font-size: 14px; color: #1c1b18;">Nordic Accent Lamp</h4>
                    <span style="font-size: 13px; color: #8c7a6b; font-weight: 600;">From $140</span>
                  </td>
                </tr>
              </table>

              <a href="#" style="display: inline-block; margin-top: 32px; background-color: #2d2b27; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-weight: 600; font-size: 13px; font-family: sans-serif; letter-spacing: 1px;">EXPLORE LOOKBOOK &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Live Music Festival VIP Pass',
    category: 'Invite to event',
    industry: 'Arts & entertainment',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
    plain_text_content: 'Get your early bird tickets for the 2026 Summer Neon Music Festival!',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Music Festival Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0914; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #141126; border-radius: 20px; overflow: hidden; border: 1px solid #2e2654; box-shadow: 0 15px 40px rgba(168,85,247,0.2);">
          
          <!-- Top Tag -->
          <tr>
            <td align="center" style="background: linear-gradient(90deg, #ec4899, #8b5cf6); padding: 10px 20px; font-size: 13px; font-weight: 800; letter-spacing: 2px;">
              ⚡ EARLY BIRD VIP TICKETS NOW LIVE
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop" alt="Music Festival Concert" width="100%" style="display: block; width: 100%; max-height: 300px; object-fit: cover;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td align="center" style="padding: 36px 28px;">
              <span style="color: #ec4899; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">SUMMER FESTIVAL 2026</span>
              <h1 style="margin: 8px 0 16px 0; font-size: 34px; font-weight: 900; color: #ffffff; line-height: 1.1; letter-spacing: -0.5px;">NEON HORIZON MUSIC FEST</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #c4b5fd;">
                3 Days. 4 Stages. 50+ World-Class Artists. Experience live performances under the summer stars with immersive light installations.
              </p>

              <!-- Venue Details -->
              <div style="background-color: #1e1938; border: 1px solid #3b306b; border-radius: 12px; padding: 18px 24px; width: 100%; box-sizing: border-box; text-align: center; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #f472b6;">🗓️ AUG 24 - 26, 2026 | METRO ARENA PARK</p>
              </div>

              <a href="#" style="display: inline-block; background: linear-gradient(90deg, #d946ef, #8b5cf6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 800; font-size: 15px; letter-spacing: 1px;">GET YOUR VIP TICKETS NOW &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Next-Gen AI Platform Update & Launch',
    category: 'Announcement',
    industry: 'Technology & software',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    plain_text_content: 'Introducing Platform v2.0 with real-time AI automation workflows.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Platform v2.0 Announcement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #111726; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Top Header -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0b1120; border-bottom: 1px solid #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px;">SYNAPSE AI</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; background-color: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-weight: 700;">MAJOR RELEASE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop" alt="Technology Circuit" width="100%" style="display: block; width: 100%; max-height: 280px; object-fit: cover;">
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <span style="color: #38bdf8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">RELEASE NOTES V2.0</span>
              <h1 style="margin: 8px 0 16px 0; font-size: 28px; font-weight: 800; color: #ffffff; line-height: 1.2;">Autonomous AI Agents Are Now Live</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #94a3b8;">
                We are thrilled to launch Synapse v2.0! Automate your entire developer pipeline, perform real-time code refactoring, and deploy background tasks with zero infrastructure overhead.
              </p>

              <!-- Feature Bullet Cards -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <h4 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 15px;">What's New in Version 2.0:</h4>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #cbd5e1;">✨ <strong>10x Faster Inference Engine:</strong> Low-latency streaming responses.</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #cbd5e1;">⚡ <strong>Multi-Agent Workflows:</strong> Orchestrate parallel autonomous subagents.</p>
                <p style="margin: 0; font-size: 13px; color: #cbd5e1;">🔒 <strong>Enterprise Security:</strong> End-to-end SOC2 compliance & data privacy.</p>
              </div>

              <a href="#" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 14px;">TRY SYNAPSE V2.0 FREE &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    template_name: 'Heavy Equipment & Commercial Construction',
    category: 'Sell services',
    industry: 'Industrial services',
    is_predesigned: 1,
    thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop',
    plain_text_content: 'Commercial Equipment Fleet Rental & Engineering Solutions by Titan Build.',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Industrial Construction Solutions</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 8px 24px rgba(0,0,0,0.06);">
          
          <!-- Header Logo Bar -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0f172a; color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 22px; font-weight: 900; color: #f59e0b; letter-spacing: 1px;">TITAN BUILD INDUSTRIAL</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: bold;">ISO 9001 CERTIFIED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop" alt="Construction Equipment" width="100%" style="display: block; width: 100%; max-height: 280px; object-fit: cover;">
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <span style="color: #d97706; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">COMMERCIAL FLEET SOLUTIONS</span>
              <h1 style="margin: 8px 0 16px 0; font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1.2;">Heavy Equipment & Structural Engineering</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Need high-capacity cranes, excavators, or certified site engineering teams for your next industrial project? Titan Build delivers turnkey machinery rental and site management.
              </p>

              <!-- Services List -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a;">🚜 <strong>Heavy Fleet Rental:</strong> Cranes, Bulldozers, Hydraulic Excavators</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a;">🏗️ <strong>Civil Engineering:</strong> Structural Foundation & Concrete Paving</p>
                <p style="margin: 0; font-size: 14px; color: #0f172a;">🛡️ <strong>Safety On-Site:</strong> 24/7 Monitored Compliance Standards</p>
              </div>

              <a href="#" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;">REQUEST AN INSTANT SITE ESTIMATE &rarr;</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
];

async function seedPredesignedTemplates() {
  try {
    for (const tmpl of PRE_DESIGNED_TEMPLATES) {
      const [existing] = await pool.query(
        'SELECT id FROM templates WHERE template_name = ? AND is_predesigned = 1',
        [tmpl.template_name]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO templates (
            template_name,
            category,
            industry,
            is_predesigned,
            thumbnail,
            html_content,
            plain_text_content,
            include_footer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            tmpl.template_name,
            tmpl.category,
            tmpl.industry,
            tmpl.is_predesigned,
            tmpl.thumbnail,
            tmpl.html_content,
            tmpl.plain_text_content
          ]
        );
        console.log(`[Seed Templates] Created predesigned template: ${tmpl.template_name} (${tmpl.industry})`);
      } else {
        // Update existing predesigned template content to keep it fresh
        await pool.query(
          `UPDATE templates SET 
            category = ?,
            industry = ?,
            thumbnail = ?,
            html_content = ?,
            plain_text_content = ?
          WHERE id = ?`,
          [
            tmpl.category,
            tmpl.industry,
            tmpl.thumbnail,
            tmpl.html_content,
            tmpl.plain_text_content,
            existing[0].id
          ]
        );
      }
    }
    console.log('[Seed Templates] Predesigned industry templates seed sync complete.');
  } catch (error) {
    console.error('[Seed Templates] Seeding error:', error);
  }
}

module.exports = seedPredesignedTemplates;
