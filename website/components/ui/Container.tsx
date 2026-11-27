"use client";

import styled from "styled-components";

export const Container = styled.div<{ $narrow?: boolean }>`
  width: min(${({ $narrow }) => ($narrow ? "780px" : "1160px")}, calc(100% - 2rem));
  margin-inline: auto;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    width: min(${({ $narrow }) => ($narrow ? "780px" : "1160px")}, calc(100% - 3rem));
  }
`;
