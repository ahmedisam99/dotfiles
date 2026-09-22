return {
    "nvim-telescope/telescope.nvim",
    dependencies = { 'nvim-lua/plenary.nvim' },
    keys = {
      {
        "<leader>fp",
        function() require("telescope.builtin").find_files({ cwd = require("lazy.core.config").options.root }) end,
        desc = "Find Plugin File",
      },
      {
        "<leader>pf",
        function() require("telescope.builtin").find_files() end,
        desc = "Find Project File",
      },
      {
        "<C-p>",
        function() require("telescope.builtin").git_files() end,
        desc = "Find Project (Git) File",
      },
      {
        "<leader>ps",
        function() require("telescope.builtin").grep_string({ search = vim.fn.input("Find string > ") }) end,
        desc = "Grep somthing",
      },
    },
    opts = {
      defaults = {
        layout_strategy = "horizontal",
        layout_config = { prompt_position = "top" },
        sorting_strategy = "ascending",
        winblend = 0,
      },
    },
}