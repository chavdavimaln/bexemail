# Marketing Pricing Module & Plan Management User Guide

## 1. Overview
The BexEmail Pricing & Plan Management module provides a full Mailchimp-grade marketing pricing experience, featuring dynamic plans, 14-day free trials, 50% discount promotions, feature comparison matrices, and an Admin Plan Control Panel.

---

## 2. Public Pages & User Flow

### A. Marketing Pricing Page (`/pricing`)
- **Try Risk-Free Hero**: Displays "Try Bex-email's Standard plan for free!" with 5 key feature bullets, ROI badge, contacts capacity selector, and 14-Day Trial start button.
- **Save 50% Hero**: Displays "Try our Standard plan for 50% off!" with 12-month half-price savings details and bullet points.
- **4-Plan Grid**: Connected to MySQL database displaying:
  1. `Under 350 contacts? It's free`
  2. `Essentials`
  3. `Standard` (*Recommended*)
  4. `Premium`
- **Trusted Industry Leader Section**: Highlighting 24x ROI, 99.9% uptime, 100M+ sends, and 24/7 support.
- **Basic Plans for Smaller Businesses**: Starter tier options.
- **Frequently Asked Questions (FAQs)**: Accordion answers.

### B. Plan Comparison Matrix (`/compare-plans`)
- Interactive side-by-side feature comparison across all 4 plans covering AI Copywriting, Automation Journey Builders, Send Limits, Support Options, and Custom DKIM Authentication.

---

## 3. Admin Plan Management Instructions (`/settings/plans`)

### How to Edit Plan Prices, Rates, & Trial Days
1. Log in as **Admin** or **Super Admin**.
2. Navigate to **Profiles** $\rightarrow$ **Plan Management & Pricing** (or `/settings/plans`).
3. Under the **Marketing Plans Catalogue** tab, click **Edit** on any plan card.
4. Modify any field:
   - **Plan Name & Tagline**
   - **Monthly Price (₹)**
   - **Discount %** (e.g., 50%)
   - **Trial Days** (e.g., 14 Days)
   - **Contact Limit & Monthly Email Sends Limit**
   - **Plan Features List**
5. Click **Save Changes**. The `/pricing` page updates instantly from the database!

### How to Add a New Plan
1. Click **+ Add New Plan** in top control bar.
2. Enter Plan Name, Code Slug, Price, Trial Days, Limits, and Features.
3. Click **Create Plan**.

### How to Backup & Restore Plans
- **Backup**: Click **Backup Plans JSON** to download a `.json` file containing all plans & pricing configurations.
- **Restore**: Click **Restore Plans**, select a saved `.json` backup file, and confirm restoration.

### How to View Before Assigning & Confirm Plan for Users
1. Switch to the **User Plan Assignments & Trial Days** tab inside `/settings/plans`.
2. Find the target registered user account.
3. Click **View Before Assign**.
4. In the preview modal:
   - Inspect user details.
   - Select desired plan from dropdown.
   - Review live Plan Details Preview (Price, Contact Limit, Send Limit, Discount).
   - Adjust Trial Days if needed.
5. Click **Confirm & Assign Plan**.

### How to Deassign a User Plan
- Click **Deassign** on any user row to reset their subscription back to the Free plan tier.
