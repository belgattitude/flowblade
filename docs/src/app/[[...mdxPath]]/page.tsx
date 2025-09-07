import type { Metadata } from 'next';
import { generateStaticParamsFor, importPage } from 'nextra/pages';

import { useMDXComponents } from '../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

type Props = {
  params: Promise<{
    mdxPath: string[];
  }>;
};

export async function generateMetadataOld(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { metadata } = (await importPage(params.mdxPath)) as {
    metadata: Metadata;
  };
  return metadata;
}

// eslint-disable-next-line react-hooks/rules-of-hooks,@typescript-eslint/unbound-method
const Wrapper = useMDXComponents({}).wrapper;

export default async function Page(props: Props) {
  const params = await props.params;
  const {
    default: MDXContent,
    toc,
    metadata,
    sourceCode,
  } = await importPage(params.mdxPath);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
