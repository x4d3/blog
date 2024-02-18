---
layout: post
title: How this blog is powered
category: Dev
---

This blog is powered by [Jekyll](https://jekyllrb.com/), using github actions to publish to an FTP server.

It's using a template using [Simple.css](https://simplecss.org/) to make it as simple as possible.

## Github action

### `.github/workflows/deploy.yml`

```yaml
name: Build and deploy Jekyll site to xade.eu
on:
  push:
    branches:
      - master
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 📂 setup
        uses: actions/checkout@v2

        # include the lines below if you are using jekyll-last-modified-at
        # or if you would otherwise need to fetch the full commit history
        # however this may be very slow for large repositories!
        # with:
        # fetch-depth: '0'
      - name: 💎 setup ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 2.7 # can change this to 2.7 or whatever version you prefer

      - name: 🔨 install dependencies & build site
        uses: limjh16/jekyll-action-ts@v2
        with:
          enable_cache: true
          ### Enables caching. Similar to https://github.com/actions/cache.
          #
          format_output: true
          ### Uses prettier https://prettier.io to format jekyll output HTML.
          #
          # prettier_opts: '{ "useTabs": true }'
          ### Sets prettier options (in JSON) to format output HTML. For example, output tabs over spaces.
          ### Possible options are outlined in https://prettier.io/docs/en/options.html
          #
          # prettier_ignore: 'about/*'
          ### Ignore paths for prettier to not format those html files.
          ### Useful if the file is exceptionally large, so formatting it takes a while.
          ### Also useful if HTML compression is enabled for that file / formatting messes it up.
          #
          # jekyll_src: sample_site
          ### If the jekyll website source is not in root, specify the directory. (in this case, sample_site)
          ### By default, this is not required as the action searches for a _config.yml automatically.
          #
          # gem_src: sample_site
          ### By default, this is not required as the action searches for a _config.yml automatically.
          ### However, if there are multiple Gemfiles, the action may not be able to determine which to use.
          ### In that case, specify the directory. (in this case, sample_site)
          ###
          ### If jekyll_src is set, the action would automatically choose the Gemfile in jekyll_src.
          ### In that case this input may not be needed as well.
          #
          # key: ${{ runner.os }}-gems-${{ hashFiles('**/Gemfile.lock') }}
          # restore-keys: ${{ runner.os }}-gems-
          ### In cases where you want to specify the cache key, enable the above 2 inputs
          ### Follows the format here https://github.com/actions/cache
          #
          # custom_opts: '--drafts --future'
          ### If you need to specify any Jekyll build options, enable the above input
          ### Flags accepted can be found here https://jekyllrb.com/docs/configuration/options/#build-command-options
      - uses: SamKirkland/FTP-Deploy-Action@4.3.3
        with:
          server: ftp.cluster003.hosting.ovh.net
          local-dir: ./_site/
          username: iforever
          password: ${{ secrets.ftp_password }}
          server-dir: xade/blog/

```

### Ruby script to create posts automatically

```ruby
#!/usr/bin/env ruby

require 'time'
require 'fileutils'
require 'erb'
TEMPLATE = <<~EOS
  ---
  layout: post
  title: <%= title %>
  category: Music
  ---
EOS

def slugify(s)
   s.downcase.strip.gsub(' ', '-').gsub(/[^\w-]/, '')
end


ERBContext = Struct.new(:title, keyword_init: true) do
  def access_binding
    binding
  end
end
FOLDER = "_posts"

def create_post(title)
  date = Date.today

  context = ERBContext.new(title: title)
  result = ERB.new(TEMPLATE).result(context.access_binding)

  filename = "#{date.strftime('%Y-%m-%d')}-#{slugify(title)}.md"
  filepath = File.join(FOLDER, filename)

  if File.exist?(filepath)
    warn "File #{filepath} already exists"
  else
    File.write(filepath, result)
    puts "File created: #{filepath}"
  end
end


raise "provide the title as argument" if ARGV.empty?

create_post(ARGV.join(' '))
```



