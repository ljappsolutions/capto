"use client";

import Link from "next/link";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionLead, SectionHead } from "@/components/ui/Section";

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.93rem;

  th,
  td {
    padding: 0.85rem 1.1rem;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  thead th {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.muted};
    background: ${({ theme }) => theme.colors.bgAlt};
  }

  td:first-child a {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.ink};
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.accent};
    }
  }

  td small {
    display: block;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.82rem;
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const Note = styled.div`
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1.1fr 1fr;
    align-items: center;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
  }

  pre {
    margin: 0;
    padding: 0.9rem 1.1rem;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.line};
    background: ${({ theme }) => theme.colors.bgAlt};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.82rem;
    line-height: 1.7;
    overflow-x: auto;
  }

  pre span {
    color: ${({ theme }) => theme.colors.accent};
    user-select: none;
  }
`;

const rows = [
  {
    name: "Amazon S3",
    href: "/docs/aws-s3",
    sdk: "@aws-sdk/client-s3",
    sign: "SigV4 pre-signed GET",
    max: "7 days",
    emu: "S3Mock",
  },
  {
    name: "S3-compatible",
    note: "Cloudflare R2, Backblaze B2, Wasabi, MinIO",
    href: "/docs/s3-compatible",
    sdk: "@aws-sdk/client-s3",
    sign: "SigV4, custom endpoint",
    max: "7 days",
    emu: "S3Mock",
  },
  {
    name: "Azure Blob Storage",
    href: "/docs/azure",
    sdk: "@azure/storage-blob",
    sign: "Read-only blob SAS",
    max: "30 days",
    emu: "Azurite",
  },
  {
    name: "Google Cloud Storage",
    href: "/docs/gcs",
    sdk: "@google-cloud/storage",
    sign: "V4 signed URL",
    max: "7 days",
    emu: "fake-gcs-server",
  },
];

export function Providers() {
  return (
    <Section id="storage">
      <Container>
        <SectionHead>
          <Eyebrow>Storage</Eyebrow>
          <SectionTitle>Your bucket, your keys, your bill</SectionTitle>
          <SectionLead>
            Point Capto at a private bucket and credentials scoped to one folder. Videos never touch a third party, and
            links stop working when they expire or when you delete the object.
          </SectionLead>
        </SectionHead>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">SDK</th>
                <th scope="col">Link signing</th>
                <th scope="col">Max expiry</th>
                <th scope="col">Local emulator</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>
                    <Link href={r.href}>{r.name}</Link>
                    {r.note && <small>{r.note}</small>}
                  </td>
                  <td>
                    <code>{r.sdk}</code>
                  </td>
                  <td>{r.sign}</td>
                  <td>{r.max}</td>
                  <td>{r.emu}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
        <Note>
          <p>
            Every provider has an integration test that runs against a local emulator in Docker, so you can hack on
            uploads and signing without a cloud account. Azure and Google Cloud are tested against emulators only so
            far, and reports from real accounts are welcome.
          </p>
          <pre>
            <span>$ </span>yarn test:storage:up{"\n"}
            <span>$ </span>yarn test:storage{"\n"}
            <span>$ </span>yarn test:storage:down
          </pre>
        </Note>
      </Container>
    </Section>
  );
}
