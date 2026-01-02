#!/bin/sh

# 思维导图项目运行脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查包管理器
check_package_manager() {
    if command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    else
        echo "npm"
    fi
}

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$PROJECT_ROOT/web"
CORE_DIR="$PROJECT_ROOT/simple-mind-map"

# 开发模式
dev() {
    print_info "启动开发服务器..."

    # 检查 web 目录是否存在
    if [ ! -d "$WEB_DIR" ]; then
        print_error "web 目录不存在: $WEB_DIR"
        exit 1
    fi

    # 检查是否已安装依赖
    if [ ! -d "$WEB_DIR/node_modules" ]; then
        print_warn "未检测到 node_modules，正在安装依赖..."
        install_deps
    fi

    # 检查包管理器
    PM=$(check_package_manager)
    print_info "使用包管理器: $PM"

    cd "$WEB_DIR"

    case $PM in
        "pnpm")
            pnpm serve
            ;;
        "yarn")
            yarn serve
            ;;
        *)
            npm run serve
            ;;
    esac
}

# 安装依赖
install_deps() {
    print_info "安装依赖..."

    PM=$(check_package_manager)
    print_info "使用包管理器: $PM"

    # 安装核心库依赖
    if [ -d "$CORE_DIR" ]; then
        print_info "安装核心库依赖..."
        cd "$CORE_DIR"
        case $PM in
            "pnpm")
                pnpm install
                ;;
            "yarn")
                yarn install
                ;;
            *)
                npm install
                ;;
        esac
    fi

    # 安装 web 应用依赖
    if [ -d "$WEB_DIR" ]; then
        print_info "安装 web 应用依赖..."
        cd "$WEB_DIR"
        case $PM in
            "pnpm")
                pnpm install
                ;;
            "yarn")
                yarn install
                ;;
            *)
                npm install
                ;;
        esac
    fi

    print_info "依赖安装完成！"
}

# 构建项目
build() {
    print_info "构建项目..."

    if [ ! -d "$WEB_DIR/node_modules" ]; then
        print_warn "未检测到 node_modules，正在安装依赖..."
        install_deps
    fi

    cd "$WEB_DIR"

    PM=$(check_package_manager)
    case $PM in
        "pnpm")
            pnpm build
            ;;
        "yarn")
            yarn build
            ;;
        *)
            npm run build
            ;;
    esac

    print_info "构建完成！输出目录: $PROJECT_ROOT/dist"
}

# 构建核心库
build_lib() {
    print_info "构建核心库..."

    if [ ! -d "$WEB_DIR/node_modules" ]; then
        print_warn "未检测到 node_modules，正在安装依赖..."
        install_deps
    fi

    cd "$WEB_DIR"

    PM=$(check_package_manager)
    case $PM in
        "pnpm")
            pnpm buildLibrary
            ;;
        "yarn")
            yarn buildLibrary
            ;;
        *)
            npm run buildLibrary
            ;;
    esac

    print_info "核心库构建完成！输出目录: $CORE_DIR/dist"
}

# 代码检查
lint() {
    print_info "代码检查..."

    PM=$(check_package_manager)

    # 检查核心库
    if [ -d "$CORE_DIR" ]; then
        print_info "检查核心库..."
        cd "$CORE_DIR"
        case $PM in
            "pnpm")
                pnpm lint
                ;;
            "yarn")
                yarn lint
                ;;
            *)
                npm run lint
                ;;
        esac
    fi

    # 检查 web 应用
    if [ -d "$WEB_DIR" ]; then
        print_info "检查 web 应用..."
        cd "$WEB_DIR"
        case $PM in
            "pnpm")
                pnpm lint
                ;;
            "yarn")
                yarn lint
                ;;
            *)
                npm run lint
                ;;
        esac
    fi
}

# 代码格式化
format() {
    print_info "代码格式化..."

    PM=$(check_package_manager)

    # 格式化核心库
    if [ -d "$CORE_DIR" ]; then
        print_info "格式化核心库..."
        cd "$CORE_DIR"
        case $PM in
            "pnpm")
                pnpm format
                ;;
            "yarn")
                yarn format
                ;;
            *)
                npm run format
                ;;
        esac
    fi

    # 格式化 web 应用
    if [ -d "$WEB_DIR" ]; then
        print_info "格式化 web 应用..."
        cd "$WEB_DIR"
        case $PM in
            "pnpm")
                pnpm format
                ;;
            "yarn")
                yarn format
                ;;
            *)
                npm run format
                ;;
        esac
    fi
}

# 清理
clean() {
    print_info "清理构建文件和依赖..."

    # 清理 node_modules
    if [ -d "$CORE_DIR/node_modules" ]; then
        print_info "清理核心库 node_modules..."
        rm -rf "$CORE_DIR/node_modules"
    fi

    if [ -d "$WEB_DIR/node_modules" ]; then
        print_info "清理 web 应用 node_modules..."
        rm -rf "$WEB_DIR/node_modules"
    fi

    # 清理构建产物
    if [ -d "$CORE_DIR/dist" ]; then
        print_info "清理核心库 dist..."
        rm -rf "$CORE_DIR/dist"
    fi

    if [ -d "$PROJECT_ROOT/dist" ]; then
        print_info "清理项目 dist..."
        rm -rf "$PROJECT_ROOT/dist"
    fi

    # 清理 lock 文件
    if [ -f "$CORE_DIR/package-lock.json" ]; then
        rm -f "$CORE_DIR/package-lock.json"
    fi
    if [ -f "$WEB_DIR/package-lock.json" ]; then
        rm -f "$WEB_DIR/package-lock.json"
    fi

    print_info "清理完成！"
}

# 显示帮助信息
help() {
    echo "思维导图项目运行脚本"
    echo ""
    echo "用法:"
    echo "  bash run.sh [命令]"
    echo ""
    echo "命令:"
    echo "  dev, start       启动开发服务器"
    echo "  install, i       安装依赖"
    echo "  build            构建生产版本"
    echo "  build-lib        构建核心库"
    echo "  lint             代码检查"
    echo "  format           代码格式化"
    echo "  clean            清理构建文件和依赖"
    echo "  help, h          显示帮助信息"
    echo ""
    echo "示例:"
    echo "  bash run.sh dev       # 启动开发服务器"
    echo "  bash run.sh build     # 构建生产版本"
    echo "  bash run.sh clean     # 清理所有"
}

# 主逻辑
case "${1:-help}" in
    dev|start)
        dev
        ;;
    install|i)
        install_deps
        ;;
    build)
        build
        ;;
    build-lib)
        build_lib
        ;;
    lint)
        lint
        ;;
    format)
        format
        ;;
    clean)
        clean
        ;;
    help|h|--help|-h)
        help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        help
        exit 1
        ;;
esac
