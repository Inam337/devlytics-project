import { renderMailTemplate } from './mail-template.renderer';

describe('renderMailTemplate', () => {
  it('renders subject, body paragraphs and escapes HTML-unsafe content', () => {
    const result = renderMailTemplate({
      subject: 'Hello <there>',
      preheader: 'A quick preview',
      bodyParagraphs: ['Line one', 'Line two & more'],
    });

    expect(result.subject).toBe('Hello <there>');
    expect(result.html).toContain('Hello &lt;there&gt;');
    expect(result.html).toContain('Line one');
    expect(result.html).toContain('Line two &amp; more');
    expect(result.text).toContain('A quick preview');
    expect(result.text).toContain('Line one');
  });

  it('includes an optional metric row, list, CTA and footer when provided', () => {
    const result = renderMailTemplate({
      subject: 'Weekly summary',
      bodyParagraphs: ['Here is your week.'],
      metricRows: [{ label: 'Commits', value: '42', delta: '+5' }],
      list: [{ label: 'Repo A', detail: '12 PRs merged' }],
      cta: { label: 'View dashboard', url: 'https://app.devlytics.local' },
      footer: 'Sent by Devlytics.',
    });

    expect(result.html).toContain('42');
    expect(result.html).toContain('Commits');
    expect(result.html).toContain('+5');
    expect(result.html).toContain('Repo A');
    expect(result.html).toContain('12 PRs merged');
    expect(result.html).toContain('https://app.devlytics.local');
    expect(result.html).toContain('View dashboard');
    expect(result.html).toContain('Sent by Devlytics.');

    expect(result.text).toContain('Commits: 42 (+5)');
    expect(result.text).toContain('- Repo A: 12 PRs merged');
    expect(result.text).toContain(
      'View dashboard: https://app.devlytics.local',
    );
    expect(result.text).toContain('Sent by Devlytics.');
  });

  it('omits optional sections entirely when not provided', () => {
    const result = renderMailTemplate({
      subject: 'Bare minimum',
      bodyParagraphs: ['Just a body.'],
    });

    expect(result.html).not.toContain('<ul');
    expect(result.html).not.toContain('background:#2563eb');
  });
});
