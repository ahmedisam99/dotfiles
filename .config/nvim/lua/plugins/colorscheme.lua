return {
    "Mofiqul/vscode.nvim",
    config = function(_, opts)
        require("vscode").setup(opts)
        vim.cmd("colorscheme vscode")
    end
}

-- return {
-- 	"rose-pine/neovim",
-- 	name = "rose-pine",
--     opts = {
--       variant = "moon"
--     },
-- 	config = function(_, opts)
--         require("rose-pine").setup(opts)
-- 		vim.cmd("colorscheme rose-pine")
-- 	end
-- }