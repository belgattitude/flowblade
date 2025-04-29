import type { FC } from 'react';

type Props = {
  lang: string;
};

export const OutdatedBrowserHtml: FC<Props> = async (props) => {
  const { lang } = props;
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Browser Outdated</title>

        <style>
          {`
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
       }

       body {
        background-color: #f8f9fa;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
      }

        .card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-width: 450px;
        width: 100%;
        overflow: hidden;
    }

        .card-header {
        padding: 24px;
        text-align: center;
    }

        .icon-circle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: #fff3cd;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
    }

        .card-title {
        font-size: 24px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
    }

        .card-description {
        font-size: 16px;
        color: #666;
    }

        .card-content {
        padding: 0 24px 24px;
        text-align: center;
    }

        .text-muted {
        font-size: 14px;
        color: #6c757d;
        margin-bottom: 24px;
    }

        .browser-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }

        .browser-option {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

        .browser-icon {
        margin-bottom: 8px;
    }

        .browser-name {
        font-size: 12px;
        font-weight: 500;
    }

        .card-footer {
        padding: 0 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

        .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }

        .btn-primary {
        background-color: #0070f3;
        color: white;
        border: none;
    }

        .btn-primary:hover {
        background-color: #0051cc;
    }

        .btn-outline {
        background-color: transparent;
        color: #333;
        border: 1px solid #ddd;
    }

        .btn-outline:hover {
        background-color: #f5f5f5;
    }

        .icon {
        margin-right: 8px;
    }

        @media (max-width: 480px) {
        .card-title {
        font-size: 20px;
    }

        .card-description {
        font-size: 14px;
    }
    }
    `}
        </style>
      </head>
      <body>
        <div className="card">
          <div className="card-header">
            <div className="icon-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 className="card-title">Your Browser is Outdated</h1>
            <p className="card-description">
              The browser you are using is not supported by this website.
            </p>
          </div>
          <div className="card-content">
            <p className="text-muted">
              To ensure the best experience, please update your browser to one
              of the following options:
            </p>
            <div className="browser-options">
              <div className="browser-option">
                <div className="browser-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="21.17" y1="8" x2="12" y2="8"></line>
                    <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                    <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
                  </svg>
                </div>
                <span className="browser-name">Chrome</span>
              </div>
              <div className="browser-option">
                <div className="browser-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                  </svg>
                </div>
                <span className="browser-name">Firefox</span>
              </div>
              <div className="browser-option">
                <div className="browser-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="m14.59 11.5-2.59-2.59v7.18"></path>
                  </svg>
                </div>
                <span className="browser-name">Safari</span>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <svg
                className="icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="21.17" y1="8" x2="12" y2="8"></line>
                <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
              </svg>
              Download Chrome
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn btn-outline">
              <svg
                className="icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Continue anyway
            </a>
          </div>
        </div>
      </body>
    </html>
  );
};
