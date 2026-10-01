export function PrivacyPage() {
  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Privacy policy</h1>
        <p className="page-subtitle text-muted mb-0">Last updated: 1 October 2026</p>
      </div>

      <article className="privacy-policy">
        <p className="lead">
          Cribsheets helps you prepare and export your timesheets. We collect only what we need to run the
          service for you. We do not sell your information, use it for advertising, or share it with other
          people or companies for their own purposes.
        </p>

        <section>
          <h2>Who this applies to</h2>
          <p>
            This policy describes how the Cribsheets website and API (the &ldquo;service&rdquo;) handle
            personal information when you create an account, sign in, complete your profile, or use timesheet
            features. The person or organisation that hosts your instance of Cribsheets is the operator of
            the service (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          </p>
        </section>

        <section>
          <h2>Our commitment</h2>
          <ul>
            <li>
              We use your information only to provide and improve Cribsheets for you (accounts, timesheets,
              exports, and related support).
            </li>
            <li>We do not sell or rent your personal information.</li>
            <li>
              We do not share your personal information with advertisers, data brokers, or other third parties
              for their marketing or analytics.
            </li>
            <li>
              We do not use your timesheet or profile data for any purpose unrelated to operating this app.
            </li>
          </ul>
        </section>

        <section>
          <h2>Information we collect</h2>
          <p>Depending on how you use the service, we may store:</p>
          <ul>
            <li>
              <strong>Account details</strong> — email address and a password stored in hashed form (we never
              store your plain-text password).
            </li>
            <li>
              <strong>Profile details</strong> — name, employee number, unit or station, employment type
              (e.g. metro or country), casual status, default shift settings, an optional authorising manager
              email address, and a drawn signature image when you save one.
            </li>
            <li>
              <strong>Timesheet data</strong> — shift entries, breaks, codes, and related fields you enter to
              build your timesheet and generate exports (such as Excel files you download).
            </li>
            <li>
              <strong>Session data</strong> — a random session identifier linked to your account so you can stay
              signed in.
            </li>
            <li>
              <strong>Basic server logs</strong> — standard technical information our hosting environment may
              record (for example request time, URL, and error messages) to keep the service secure and
              reliable. We do not use third-party analytics or tracking pixels in the app.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use your information</h2>
          <p>We use the information above solely to:</p>
          <ul>
            <li>create and manage your account and sign-in sessions;</li>
            <li>pre-fill and save your profile and timesheet content;</li>
            <li>generate files you request (for example timesheet exports);</li>
            <li>protect the service against abuse and fix technical problems; and</li>
            <li>respond to you if you contact us about your account.</li>
          </ul>
          <p>
            Your exports are generated for you. Downloading a file to your device is under your control; we do
            not send your timesheet to other parties as part of generating or downloading exports.
          </p>
          <p>
            If you use <strong>Email for approval</strong>, we open your device&apos;s email app with a
            pre-filled subject and message. If you saved an authorising manager email in your profile, we
            include that address as the recipient. We do not send that email or attach your spreadsheet for you;
            you attach the file if needed and send the message from your own email account.
          </p>
        </section>

        <section>
          <h2>Where data is stored</h2>
          <p>
            Account, profile, session, and timesheet data are stored in a database on infrastructure used to
            run this service (for example a cloud host with persistent disk storage). That infrastructure
            provider processes data only as needed to host the application; we do not give them your data for
            their own products or marketing.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We use a single HTTP-only session cookie (<code>cs_session</code>) so the server knows you are
            signed in. It is not used for advertising or cross-site tracking. You can sign out to clear the
            session; blocking the cookie will prevent you from staying logged in.
          </p>
        </section>

        <section>
          <h2>Fonts and other external requests</h2>
          <p>
            The site loads web fonts from Google Fonts. When your browser requests those fonts, Google may
            receive technical data such as your IP address. That is separate from your timesheet content stored
            on our servers. We do not send your account or timesheet data to Google as part of using Cribsheets.
          </p>
        </section>

        <section>
          <h2>When disclosure might still happen</h2>
          <p>
            We do not voluntarily share your personal information with others. The only situations where
            disclosure may occur are:
          </p>
          <ul>
            <li>
              if you ask us to (for example you explicitly request help that requires sharing a detail with
              someone you name); or
            </li>
            <li>
              if we are required to do so by law, regulation, or a valid legal process, and only to the extent
              required.
            </li>
          </ul>
          <p>
            If the service is operated by an employer or group for their staff, administrators authorised by
            that operator may access data needed to run or support the service. That access is for operating
            the app, not for unrelated purposes.
          </p>
        </section>

        <section>
          <h2>How long we keep data</h2>
          <p>
            We keep your account and timesheet data while your account exists and as needed to provide the
            service. Session records expire automatically after a period of inactivity (currently up to about
            30 days, renewed while you use the site). If you want your account and associated data deleted,
            contact the service operator; we will delete or anonymise it unless we must retain something for
            legal reasons.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            Passwords are stored using one-way hashing. Sessions use random identifiers over HTTPS in
            production. No method of transmission or storage is perfectly secure; please use a strong, unique
            password and keep it confidential.
          </p>
        </section>

        <section>
          <h2>Your choices and rights</h2>
          <p>
            You can update many profile fields in the app. You may request access to, correction of, or deletion
            of personal information we hold about you by contacting the service operator. If you are in Australia,
            you may also have rights under the Privacy Act 1988 (Cth), including to complain to the Office of
            the Australian Information Commissioner if you are not satisfied with our response.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            The service is intended for adults using it in a work context. We do not knowingly collect personal
            information from children.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top will
            change when we do. Continued use of the service after an update means you accept the revised policy.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy questions, access requests, or deletion requests, contact whoever operates the
            Cribsheets instance you use (the same place you obtained your login or support details).
          </p>
        </section>
      </article>
    </>
  )
}
